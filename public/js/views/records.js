// builds the records page and drives its filtering, sorting and paging
import { announce, el, showToast } from "../ui.js";
import { getAppointments } from "../api.js";
import { buildToolbar, filterAppointments, readState, resetControls, saveState, sortAppointments, sortLabels } from "./records-filters.js";
import { buildRow, buildTable, emptyAll, emptyFiltered, focusResults, renderError, renderLoading, renderPager } from "./records-table.js";
import { openDeleteDialog } from "./delete-dialog.js";

const pageSize = 10;

export const renderRecords = (main) => {
  const state = readState();
  let appointments = [];
  let filtered = [];
  let page = 1;
  let statusTimer;
  const statusText = el("p", { class: "records-status", role: "status" });
  const tableRegion = el("div", { class: "records-table-wrap", tabindex: "-1", "aria-busy": "true" });
  const pager = el("nav", { class: "pagination", "aria-label": "Pagination", hidden: true });

  // counts how many pages the filtered list needs
  const totalPages = () => Math.max(1, Math.ceil(filtered.length / pageSize));

  // builds the result count text shown above the table
  const statusMessage = () => {
    const shown = filtered.length === 0 ? 0 : Math.min(pageSize, filtered.length - (page - 1) * pageSize);
    return `Showing ${shown} of ${filtered.length} matching appointments (${appointments.length} total)`;
  };

  // updates the count after a short delay so fast changes are announced once
  const updateStatus = () => {
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      statusText.textContent = statusMessage();
    }, 200);
  };

  // filters, sorts and renders the table
  const applyFilters = (resetPage = true) => {
    filtered = sortAppointments(filterAppointments(appointments, state), state);
    if (resetPage) {
      page = 1;
    }
    renderTable();
  };

  // sorts by a column and announces the new order for screen readers
  const sortBy = (key) => {
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = "asc";
    }
    saveState(state);
    page = 1;
    applyFilters();
    announce(`Sorted by ${sortLabels[key]}, ${state.sortDir === "asc" ? "ascending" : "descending"}`);
  };

  // renders the table or the matching empty state, then the pager and count
  const renderTable = () => {
    tableRegion.setAttribute("aria-busy", "false");
    page = Math.min(Math.max(1, page), totalPages());
    if (appointments.length === 0) {
      return showResults(emptyAll());
    }
    if (filtered.length === 0) {
      return showResults(emptyFiltered(clearFilters));
    }
    const rows = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map((item, index) => buildRow(item, index, onDelete));
    showResults(buildTable(rows, state, sortBy));
  };

  // places results in the table region and refreshes the pager and count
  const showResults = (content) => {
    tableRegion.replaceChildren(content);
    renderPager(pager, page, totalPages(), filtered.length === 0, goTo);
    updateStatus();
  };

  // opens the delete dialog and refreshes the table after a confirmed delete
  const onDelete = (appointment, opener) => {
    openDeleteDialog(appointment, opener, main, () => {
      appointments = appointments.filter((item) => item.id !== appointment.id);
      applyFilters(false);
      showToast("Appointment deleted", "success");
      announce("Appointment deleted");
      window.setTimeout(() => tableRegion.focus(), 0);
    });
  };

  // moves to another page and announces the page number
  const goTo = (next) => {
    if (next < 1 || next > totalPages()) {
      return;
    }
    page = next;
    renderTable();
    focusResults(tableRegion);
    announce(`Page ${page} of ${totalPages()}`);
  };

  // fetches the appointments and renders them
  const load = async () => {
    renderLoading(tableRegion, pager, statusText);
    try {
      appointments = await getAppointments();
      if (!tableRegion.isConnected) {
        return;
      }
      applyFilters();
    } catch (error) {
      if (tableRegion.isConnected) {
        renderError(tableRegion, pager, load);
      }
    }
  };

  // resets the saved state and every control, then reruns the filters
  const clearFilters = () => {
    resetControls(state, controls);
    applyFilters();
    announce("Filters cleared");
    controls.search.focus();
  };

  const controls = buildToolbar(state, applyFilters, clearFilters);
  main.append(
    el("div", { class: "view records-view" }, [
      el("header", { class: "view-header page-header" }, [
        el("div", {}, [
          el("h1", { id: "records-title", text: "Records" }),
          el("p", { class: "view-subtitle", text: "Search, filter, and manage every appointment." })
        ]),
        el("a", { class: "button button-primary", href: "#/appointments/new", text: "New appointment" })
      ]),
      controls.toolbar, statusText, tableRegion, pager
    ])
  );

  load();
};
