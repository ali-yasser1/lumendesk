import { announce, el, showToast } from "../ui.js";
import { deleteAppointment, getAppointments } from "../api.js";

const storageKey = "lumen-records";
const pageSize = 10;
const statuses = ["Scheduled", "Completed", "Cancelled", "No-show"];
const types = ["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"];
const sortKeys = ["patient", "date", "time", "type", "clinician", "status"];
const sortLabels = {
  patient: "Patient",
  date: "Date",
  time: "Time",
  type: "Type",
  clinician: "Clinician",
  status: "Status"
};
const statusStyles = {
  Scheduled: { className: "scheduled", icon: "◷" },
  Completed: { className: "completed", icon: "✓" },
  Cancelled: { className: "cancelled", icon: "×" },
  "No-show": { className: "no-show", icon: "⊘" }
};

const defaults = {
  search: "",
  status: "",
  type: "",
  urgent: false,
  sortKey: "date",
  sortDir: "desc"
};

const formatDate = (value) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric"
}).format(new Date(`${value}T00:00:00`));

const formatTime = (value) => {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(2000, 0, 1, hour, minute));
};

const readState = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (!saved || typeof saved !== "object") {
      return { ...defaults };
    }
    return {
      search: typeof saved.search === "string" ? saved.search : "",
      status: statuses.includes(saved.status) ? saved.status : "",
      type: types.includes(saved.type) ? saved.type : "",
      urgent: Boolean(saved.urgent),
      sortKey: sortKeys.includes(saved.sortKey) ? saved.sortKey : defaults.sortKey,
      sortDir: saved.sortDir === "asc" ? "asc" : "desc"
    };
  } catch (error) {
    return { ...defaults };
  }
};

const statusBadge = (status) => {
  const style = statusStyles[status] || statusStyles.Scheduled;
  return el("span", { class: `status-badge status-${style.className}` }, [
    el("span", { "aria-hidden": "true", text: style.icon }),
    status
  ]);
};

const urgentBadge = (urgent) => urgent
  ? el("span", { class: "status-badge status-urgent" }, [
    el("span", { "aria-hidden": "true", text: "!" }),
    "Urgent"
  ])
  : el("span", { class: "status-badge status-clear" }, [
    el("span", { "aria-hidden": "true", text: "○" }),
    "No"
  ]);

export const renderRecords = (main) => {
  const state = readState();
  let appointments = [];
  let filtered = [];
  let page = 1;
  let searchTimer;
  let statusTimer;

  const search = el("input", {
    id: "records-search",
    name: "search",
    type: "search",
    value: state.search,
    autocomplete: "off",
    "aria-describedby": "records-search-hint"
  });
  const status = el("select", { id: "records-status", name: "status" }, [
    el("option", { value: "", text: "All statuses" }),
    ...statuses.map((item) => el("option", { value: item, text: item }))
  ]);
  const type = el("select", { id: "records-type", name: "type" }, [
    el("option", { value: "", text: "All types" }),
    ...types.map((item) => el("option", { value: item, text: item }))
  ]);
  const urgent = el("input", { id: "records-urgent", name: "urgent", type: "checkbox" });
  const clear = el("button", { class: "button button-ghost", type: "button", text: "Clear filters" });
  const statusText = el("p", { class: "records-status", role: "status" });
  const tableRegion = el("div", { class: "records-table-wrap", tabindex: "-1", "aria-busy": "true" });
  const pager = el("nav", { class: "pagination", "aria-label": "Pagination", hidden: true });
  const toolbar = el("form", {
    class: "records-toolbar glass",
    role: "search",
    "aria-label": "Appointment filters",
    novalidate: true
  }, [
    el("div", { class: "field toolbar-search" }, [
      el("label", { for: search.id, text: "Search by patient or clinician" }),
      search,
      el("p", { class: "field-hint", id: "records-search-hint", text: "Search matches patient names and clinicians." })
    ]),
    el("div", { class: "field" }, [
      el("label", { for: status.id, text: "Status" }),
      status
    ]),
    el("div", { class: "field" }, [
      el("label", { for: type.id, text: "Type" }),
      type
    ]),
    el("div", { class: "field checkbox-field" }, [
      el("label", { for: urgent.id }, [urgent, el("span", { text: "Urgent only" })])
    ]),
    el("div", { class: "toolbar-actions" }, [clear])
  ]);

  status.value = state.status;
  type.value = state.type;
  urgent.checked = state.urgent;

  const saveState = () => {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  };

  const totalPages = () => Math.max(1, Math.ceil(filtered.length / pageSize));

  const sortFiltered = () => {
    const direction = state.sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const values = {
        patient: [a.patient_name, b.patient_name],
        date: [a.date, b.date],
        time: [a.time, b.time],
        type: [a.type, b.type],
        clinician: [a.clinician, b.clinician],
        status: [a.status, b.status]
      };
      const [left, right] = values[state.sortKey];
      const result = String(left).localeCompare(String(right), "en", { numeric: true });
      if (result !== 0) {
        return result * direction;
      }
      return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.id - b.id;
    });
  };

  const statusMessage = () => {
    const shown = filtered.length === 0 ? 0 : Math.min(pageSize, filtered.length - (page - 1) * pageSize);
    return `Showing ${shown} of ${filtered.length} matching appointments (${appointments.length} total)`;
  };

  const updateStatus = () => {
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      statusText.textContent = statusMessage();
    }, 200);
  };

  const focusResults = () => {
    const firstRow = tableRegion.querySelector("tbody tr[tabindex]");
    if (firstRow) {
      firstRow.focus();
    } else {
      tableRegion.focus();
    }
  };

  const sortBy = (key) => {
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = "asc";
    }
    saveState();
    page = 1;
    applyFilters();
    announce(`Sorted by ${sortLabels[key]}, ${state.sortDir === "asc" ? "ascending" : "descending"}`);
  };

  const buildHead = () => {
    const columns = [
      { key: "patient", label: "Patient" },
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "type", label: "Type" },
      { key: "clinician", label: "Clinician" },
      { key: "status", label: "Status" },
      { label: "Urgent" },
      { label: "Actions" }
    ];
    return el("thead", {}, el("tr", {}, columns.map((column) => {
      if (!column.key) {
        return el("th", { scope: "col", text: column.label });
      }
      const active = state.sortKey === column.key;
      const th = el("th", {
        scope: "col",
        "aria-sort": active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"
      });
      th.append(el("button", {
        class: "sort-button",
        type: "button",
        onClick: () => sortBy(column.key)
      }, [
        el("span", { text: column.label }),
        el("span", {
          class: "sort-icon",
          "aria-hidden": "true",
          text: active ? (state.sortDir === "asc" ? "↑" : "↓") : "↕"
        })
      ]));
      return th;
    })));
  };

  const openDelete = (appointment, opener) => {
    const cancel = el("button", { class: "button button-ghost", type: "button", text: "Cancel" });
    const confirm = el("button", { class: "button button-danger", type: "button", text: "Delete" });
    const dialog = el("dialog", { class: "modal glass", "aria-labelledby": "delete-title" }, [
      el("div", { class: "modal-inner" }, [
        el("h2", { id: "delete-title", text: "Delete appointment?" }),
        el("p", {
          text: `Delete the appointment for ${appointment.patient_name} on ${formatDate(appointment.date)} at ${formatTime(appointment.time)}? This cannot be undone.`
        }),
        el("div", { class: "modal-actions" }, [cancel, confirm])
      ])
    ]);
    let removed = false;

    dialog.addEventListener("close", () => {
      dialog.remove();
      if (!removed && opener.isConnected) {
        opener.focus();
      }
    });

    cancel.addEventListener("click", () => dialog.close());

    confirm.addEventListener("click", async () => {
      confirm.disabled = true;
      cancel.disabled = true;
      confirm.textContent = "Deleting...";
      try {
        await deleteAppointment(appointment.id);
        removed = true;
        appointments = appointments.filter((item) => item.id !== appointment.id);
        dialog.close();
        applyFilters(false);
        showToast("Appointment deleted", "success");
        announce("Appointment deleted");
        window.setTimeout(() => tableRegion.focus(), 0);
      } catch (error) {
        showToast("The appointment could not be deleted. Try again.", "error");
        confirm.disabled = false;
        cancel.disabled = false;
        confirm.textContent = "Delete";
        confirm.focus();
      }
    });

    main.append(dialog);
    dialog.showModal();
    cancel.focus();
  };

  const renderRow = (appointment, index) => {
    const dateText = formatDate(appointment.date);
    const edit = el("a", { class: "row-action", href: `#/appointments/edit/${appointment.id}` }, [
      el("span", { "aria-hidden": "true", text: "Edit" }),
      el("span", { class: "visually-hidden", text: `Edit appointment for ${appointment.patient_name} on ${dateText}` })
    ]);
    const remove = el("button", { class: "row-action row-action-danger", type: "button" }, [
      el("span", { "aria-hidden": "true", text: "Delete" }),
      el("span", { class: "visually-hidden", text: `Delete appointment for ${appointment.patient_name} on ${dateText}` })
    ]);
    remove.addEventListener("click", () => openDelete(appointment, remove));
    return el("tr", { tabindex: index === 0 ? "-1" : null }, [
      el("th", { scope: "row", "data-label": "Patient", text: appointment.patient_name }),
      el("td", { "data-label": "Date", text: dateText }),
      el("td", { "data-label": "Time", text: formatTime(appointment.time) }),
      el("td", { "data-label": "Type", text: appointment.type }),
      el("td", { "data-label": "Clinician", text: appointment.clinician }),
      el("td", { "data-label": "Status" }, statusBadge(appointment.status)),
      el("td", { "data-label": "Urgent" }, urgentBadge(appointment.urgent)),
      el("td", { "data-label": "Actions" }, el("div", { class: "row-actions" }, [edit, remove]))
    ]);
  };

  const renderPager = () => {
    const pages = totalPages();
    pager.hidden = filtered.length === 0;
    if (filtered.length === 0) {
      pager.replaceChildren();
      return;
    }
    const previous = el("button", {
      class: "button button-ghost",
      type: "button",
      text: "Previous",
      disabled: page <= 1,
      onClick: () => goTo(page - 1)
    });
    const next = el("button", {
      class: "button button-ghost",
      type: "button",
      text: "Next",
      disabled: page >= pages,
      onClick: () => goTo(page + 1)
    });
    pager.replaceChildren(
      previous,
      el("p", { class: "pagination-status", text: `Page ${page} of ${pages}` }),
      next
    );
  };

  const emptyFiltered = () => el("div", { class: "state-panel" }, [
    el("h2", { text: "No appointments match these filters" }),
    el("p", { text: "Try a different search or clear the filters to see more appointments." }),
    el("button", {
      class: "button button-primary",
      type: "button",
      text: "Clear filters",
      onClick: clearFilters
    })
  ]);

  const emptyAll = () => el("div", { class: "state-panel" }, [
    el("h2", { text: "No appointments yet" }),
    el("p", { text: "Create the first appointment and it will appear in this table." }),
    el("a", { class: "button button-primary", href: "#/appointments/new", text: "New appointment" })
  ]);

  const renderTable = () => {
    tableRegion.setAttribute("aria-busy", "false");
    const pages = totalPages();
    page = Math.min(Math.max(1, page), pages);
    if (appointments.length === 0) {
      tableRegion.replaceChildren(emptyAll());
      renderPager();
      updateStatus();
      return;
    }
    if (filtered.length === 0) {
      tableRegion.replaceChildren(emptyFiltered());
      renderPager();
      updateStatus();
      return;
    }
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    const table = el("table", { class: "records-table" }, [
      el("caption", { class: "visually-hidden", text: "Appointments matching the current filters" }),
      buildHead(),
      el("tbody", {}, visible.map(renderRow))
    ]);
    tableRegion.replaceChildren(table);
    renderPager();
    updateStatus();
  };

  const applyFilters = (resetPage = true) => {
    const query = state.search.trim().toLowerCase();
    filtered = appointments.filter((appointment) => (
      (!query || appointment.patient_name.toLowerCase().includes(query) || appointment.clinician.toLowerCase().includes(query)) &&
      (!state.status || appointment.status === state.status) &&
      (!state.type || appointment.type === state.type) &&
      (!state.urgent || appointment.urgent)
    ));
    sortFiltered();
    if (resetPage) {
      page = 1;
    }
    renderTable();
  };

  const goTo = (next) => {
    if (next < 1 || next > totalPages()) {
      return;
    }
    page = next;
    renderTable();
    focusResults();
    announce(`Page ${page} of ${totalPages()}`);
  };

  const clearFilters = () => {
    state.search = "";
    state.status = "";
    state.type = "";
    state.urgent = false;
    search.value = "";
    status.value = "";
    type.value = "";
    urgent.checked = false;
    saveState();
    applyFilters();
    announce("Filters cleared");
    search.focus();
  };

  const renderLoading = () => {
    tableRegion.setAttribute("aria-busy", "true");
    pager.hidden = true;
    statusText.textContent = "";
    tableRegion.replaceChildren(el("table", { class: "records-table" }, [
      el("caption", { class: "visually-hidden", text: "Appointments" }),
      buildHead(),
      el("tbody", {}, [1, 2, 3, 4, 5].map(() => el("tr", { class: "skeleton-row" }, el("td", { colspan: "8" }, el("span", { class: "skeleton-line" })))))
    ]));
    announce("Loading records");
  };

  const renderError = () => {
    tableRegion.setAttribute("aria-busy", "false");
    pager.hidden = true;
    tableRegion.replaceChildren(el("div", { class: "state-panel error-state" }, [
      el("h2", { text: "We could not load the records" }),
      el("p", { text: "Check the connection and try again." }),
      el("button", { class: "button button-primary", type: "button", onClick: load, text: "Try again" })
    ]));
    showToast("The records could not load.", "error");
  };

  const load = async () => {
    renderLoading();
    try {
      appointments = await getAppointments();
      if (!tableRegion.isConnected) {
        return;
      }
      applyFilters();
    } catch (error) {
      if (tableRegion.isConnected) {
        renderError();
      }
    }
  };

  search.addEventListener("input", () => {
    state.search = search.value;
    saveState();
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(applyFilters, 200);
  });
  status.addEventListener("change", () => {
    state.status = status.value;
    saveState();
    applyFilters();
  });
  type.addEventListener("change", () => {
    state.type = type.value;
    saveState();
    applyFilters();
  });
  urgent.addEventListener("change", () => {
    state.urgent = urgent.checked;
    saveState();
    applyFilters();
  });
  clear.addEventListener("click", clearFilters);
  toolbar.addEventListener("submit", (event) => event.preventDefault());

  main.append(
    el("div", { class: "view records-view" }, [
      el("header", { class: "view-header page-header" }, [
        el("div", {}, [
          el("h1", { id: "records-title", text: "Records" }),
          el("p", { class: "view-subtitle", text: "Search, filter, and manage every appointment." })
        ]),
        el("a", { class: "button button-primary", href: "#/appointments/new", text: "New appointment" })
      ]),
      toolbar,
      statusText,
      tableRegion,
      pager
    ])
  );

  load();
};
