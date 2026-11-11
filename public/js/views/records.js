// builds the records page and drives its filtering, sorting and paging
import { announce, el, showMessage } from "../ui.js";
import { getAppointments } from "../api.js";
import { buildToolbar, filterAppointments, freshState, resetControls, sortAppointments, sortLabels } from "./records-filters.js";
import { buildRow, buildTable, emptyAll, emptyFiltered, focusResults, renderError, renderLoading, renderPager } from "./records-table.js";
import { openDeleteDialog } from "./delete-dialog.js";

const pageSize = 10;

// counts how many pages the filtered list needs
const totalPages = (view) => Math.max(1, Math.ceil(view.filtered.length / pageSize));

// builds the result count text shown above the table
const statusMessage = (view) => {
  const shown = view.filtered.length === 0 ? 0 : Math.min(pageSize, view.filtered.length - (view.page - 1) * pageSize);
  return `Showing ${shown} of ${view.filtered.length} matching appointments (${view.appointments.length} total)`;
};

// updates the count after a short delay so fast changes are announced once
const updateStatus = (view) => {
  window.clearTimeout(view.statusTimer);
  view.statusTimer = window.setTimeout(() => { view.statusText.textContent = statusMessage(view); }, 200);
};

// filters, sorts and renders the table
const applyFilters = (view, resetPage = true) => {
  view.filtered = sortAppointments(filterAppointments(view.appointments, view.state), view.state);
  if (resetPage) { view.page = 1; }
  renderTable(view);
};

// sorts by a column and announces the new order for screen readers
const sortBy = (view, key) => {
  const state = view.state;
  if (state.sortKey === key) { state.sortDir = state.sortDir === "asc" ? "desc" : "asc"; }
  else { state.sortKey = key; state.sortDir = "asc"; }
  view.page = 1;
  applyFilters(view);
  announce(`Sorted by ${sortLabels[key]}, ${state.sortDir === "asc" ? "ascending" : "descending"}`);
};

// renders the table or the matching empty state, then the pager and count
const renderTable = (view) => {
  view.tableRegion.setAttribute("aria-busy", "false");
  view.page = Math.min(Math.max(1, view.page), totalPages(view));
  if (view.appointments.length === 0) { return showResults(view, emptyAll()); }
  if (view.filtered.length === 0) { return showResults(view, emptyFiltered(() => clearFilters(view))); }
  const rows = view.filtered
    .slice((view.page - 1) * pageSize, view.page * pageSize)
    .map((item, index) => buildRow(item, index, (appointment, opener) => onDelete(view, appointment, opener)));
  showResults(view, buildTable(rows, view.state, (key) => sortBy(view, key)));
};

// places results in the table region and refreshes the pager and count
const showResults = (view, content) => {
  view.tableRegion.replaceChildren(content);
  renderPager(view.pager, view.page, totalPages(view), view.filtered.length === 0, (next) => goTo(view, next));
  updateStatus(view);
};

// opens the delete dialog and refreshes the table after a confirmed delete
const onDelete = (view, appointment, opener) => {
  openDeleteDialog(appointment, opener, view.main, () => {
    view.appointments = view.appointments.filter((item) => item.id !== appointment.id);
    applyFilters(view, false);
    showMessage("Appointment deleted", "success");
    window.setTimeout(() => view.tableRegion.focus(), 0);
  });
};

// moves to another page and announces the page number
const goTo = (view, next) => {
  if (next < 1 || next > totalPages(view)) { return; }
  view.page = next;
  renderTable(view);
  focusResults(view.tableRegion);
  announce(`Page ${view.page} of ${totalPages(view)}`);
};

// fetches the appointments and renders them
const loadRecords = async (view) => {
  renderLoading(view.tableRegion, view.pager, view.statusText);
  try {
    view.appointments = await getAppointments();
    if (view.tableRegion.isConnected) { applyFilters(view); }
  } catch (error) {
    if (view.tableRegion.isConnected) { renderError(view.tableRegion, view.pager, () => loadRecords(view)); }
  }
};

// resets the toolbar controls and reruns the filters
const clearFilters = (view) => {
  resetControls(view.state, view.controls);
  applyFilters(view);
  announce("Filters cleared");
  view.controls.search.focus();
};

// builds the records page shell and starts loading the appointments
export const renderRecords = (main) => {
  const view = {
    main, state: freshState(), appointments: [], filtered: [], page: 1, statusTimer: null,
    statusText: el("p", { class: "records-status", role: "status" }),
    tableRegion: el("div", { class: "records-table-wrap", tabindex: "-1", "aria-busy": "true" }),
    pager: el("nav", { class: "pagination", "aria-label": "Pagination", hidden: true })
  };
  view.controls = buildToolbar(view.state, () => applyFilters(view), () => clearFilters(view));
  main.append(
    el("div", { class: "view records-view" }, [
      el("header", { class: "view-header page-header" }, [
        el("div", {}, [
          el("h1", { id: "records-title", text: "Records" }),
          el("p", { class: "view-subtitle", text: "Search, filter, and manage every appointment." })
        ]),
        el("a", { class: "button button-primary", href: "#/appointments/new", text: "New appointment" })
      ]),
      view.controls.toolbar, view.statusText, view.tableRegion, view.pager
    ])
  );
  loadRecords(view);
};
