// renders the records table region, its head, rows, badges, pager and states
import { announce, el, loadingMessage, showToast, statePanel } from "../ui.js";
import { formatDate, formatTime } from "../format.js";
import { sortLabels } from "./records-filters.js";

const statusStyles = {
  Scheduled: { className: "scheduled", icon: "◷" },
  Completed: { className: "completed", icon: "✓" },
  Cancelled: { className: "cancelled", icon: "×" },
  "No-show": { className: "no-show", icon: "⊘" }
};

// table columns in display order, sortable columns carry a key
const columns = [
  ...Object.keys(sortLabels).map((key) => ({ key, label: sortLabels[key] })),
  { label: "Urgent" },
  { label: "Actions" }
];

// renders the badge that names a status with an icon so colour is never the only cue
export const statusBadge = (status) => {
  const style = statusStyles[status] || statusStyles.Scheduled;
  return el("span", { class: `status-badge status-${style.className}` }, [
    el("span", { "aria-hidden": "true", text: style.icon }),
    status
  ]);
};

// renders the urgent badge as text so it is not conveyed by colour alone
export const urgentBadge = (urgent) => {
  const style = urgent
    ? { className: "urgent", icon: "!", text: "Urgent" }
    : { className: "clear", icon: "○", text: "No" };
  return el("span", { class: `status-badge status-${style.className}` }, [
    el("span", { "aria-hidden": "true", text: style.icon }),
    style.text
  ]);
};

// builds one sortable header cell with a button and the matching aria sort value
const headCell = (column, state, onSort) => {
  if (!column.key) {
    return el("th", { scope: "col", text: column.label });
  }
  const active = state.sortKey === column.key;
  const th = el("th", {
    scope: "col",
    "aria-sort": active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"
  });
  th.append(el("button", { class: "sort-button", type: "button", onClick: () => onSort(column.key) }, [
    el("span", { text: column.label }),
    el("span", { class: "sort-icon", "aria-hidden": "true", text: active ? (state.sortDir === "asc" ? "↑" : "↓") : "↕" })
  ]));
  return th;
};

// builds one table row with the edit link and delete button
export const buildRow = (appointment, index, onDelete) => {
  const dateText = formatDate(appointment.date);
  const edit = el("a", { class: "row-action", href: `#/appointments/edit/${appointment.id}` }, [
    el("span", { "aria-hidden": "true", text: "Edit" }),
    el("span", { class: "visually-hidden", text: `Edit appointment for ${appointment.patient_name} on ${dateText}` })
  ]);
  const remove = el("button", { class: "row-action row-action-danger", type: "button" }, [
    el("span", { "aria-hidden": "true", text: "Delete" }),
    el("span", { class: "visually-hidden", text: `Delete appointment for ${appointment.patient_name} on ${dateText}` })
  ]);
  remove.addEventListener("click", () => onDelete(appointment, remove));
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

// builds the whole table with head and body for the visible rows
export const buildTable = (rows, state, onSort) => el("table", { class: "records-table" }, [
  el("caption", { class: "visually-hidden", text: "Appointments matching the current filters" }),
  el("thead", {}, el("tr", {}, columns.map((column) => headCell(column, state, onSort)))),
  el("tbody", {}, rows)
]);

// fills the pager with previous and next buttons for the current page
export const renderPager = (pager, page, pages, empty, onGo) => {
  pager.hidden = empty;
  pager.replaceChildren();
  if (empty) {
    return;
  }
  pager.append(
    el("button", { class: "button button-ghost", type: "button", text: "Previous", disabled: page <= 1, onClick: () => onGo(page - 1) }),
    el("p", { class: "pagination-status", text: `Page ${page} of ${pages}` }),
    el("button", { class: "button button-ghost", type: "button", text: "Next", disabled: page >= pages, onClick: () => onGo(page + 1) })
  );
};

// moves focus to the first row so keyboard users land inside the results
export const focusResults = (region) => {
  const firstRow = region.querySelector("tbody tr[tabindex]");
  if (firstRow) {
    firstRow.focus();
  } else {
    region.focus();
  }
};

// shown when no appointments exist at all
export const emptyAll = () => statePanel("No appointments yet",
  "Create the first appointment and it will appear in this table.",
  el("a", { class: "button button-primary", href: "#/appointments/new", text: "New appointment" }));

// shown when the filters match nothing
export const emptyFiltered = (onClear) => statePanel("No appointments match these filters",
  "Try a different search or clear the filters to see more appointments.",
  el("button", { class: "button button-primary", type: "button", text: "Clear filters", onClick: onClear }));

// shows a plain loading message with a spinner inside the busy region
export const renderLoading = (region, pager, statusText) => {
  region.setAttribute("aria-busy", "true");
  pager.hidden = true;
  statusText.textContent = "";
  region.replaceChildren(loadingMessage("Loading..."));
  announce("Loading records");
};

// shown when the records request fails, the button retries the load
export const renderError = (region, pager, retry) => {
  region.setAttribute("aria-busy", "false");
  pager.hidden = true;
  region.replaceChildren(statePanel("We could not load the records",
    "Check the connection and try again.",
    el("button", { class: "button button-primary", type: "button", onClick: retry, text: "Try again" }),
    "error-state"));
  showToast("The records could not load.", "error");
};
