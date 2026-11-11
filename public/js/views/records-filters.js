// filter, sort and toolbar logic for the records view
import { el } from "../ui.js";

// the choices offered by the filter toolbar
export const statuses = ["Scheduled", "Completed", "Cancelled", "No-show"];
export const types = ["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"];
export const sortLabels = {
  patient: "Patient", date: "Date", time: "Time",
  type: "Type", clinician: "Clinician", status: "Status"
};

// the starting state, empty filters and date descending, used every visit
export const freshState = () => ({
  search: "", status: "", type: "", urgent: false, sortKey: "date", sortDir: "desc"
});

// resets the state and the toolbar controls back to their defaults
export const resetControls = (state, controls) => {
  state.search = ""; state.status = ""; state.type = ""; state.urgent = false;
  controls.search.value = ""; controls.status.value = ""; controls.type.value = ""; controls.urgent.checked = false;
};

// checks one appointment against the search text and the active filters
const matches = (appointment, state) => {
  const query = state.search.trim().toLowerCase();
  const patient = appointment.patient_name.toLowerCase();
  const clinician = appointment.clinician.toLowerCase();
  return (!query || patient.includes(query) || clinician.includes(query)) &&
    (!state.status || appointment.status === state.status) &&
    (!state.type || appointment.type === state.type) && (!state.urgent || appointment.urgent);
};

// returns only the appointments that pass the active filters
export const filterAppointments = (appointments, state) =>
  appointments.filter((appointment) => matches(appointment, state));

// picks the value to compare for a sort key, patient sorts by name
const sortValue = (appointment, key) =>
  String(appointment[key === "patient" ? "patient_name" : key]);

// sorts a list by the active key then by date, time and id so ties stay stable
export const sortAppointments = (list, state) => {
  const direction = state.sortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const result = sortValue(a, state.sortKey).localeCompare(sortValue(b, state.sortKey), "en", { numeric: true });
    if (result !== 0) { return result * direction; }
    return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.id - b.id;
  });
};

// builds the search, filter and clear controls for the toolbar
const buildControls = (state) => {
  const search = el("input", { id: "records-search", name: "search", type: "search", value: state.search, autocomplete: "off", "aria-describedby": "records-search-hint" });
  const status = el("select", { id: "records-status", name: "status" }, [
    el("option", { value: "", text: "All statuses" }), ...statuses.map((item) => el("option", { value: item, text: item }))
  ]);
  const type = el("select", { id: "records-type", name: "type" }, [
    el("option", { value: "", text: "All types" }), ...types.map((item) => el("option", { value: item, text: item }))
  ]);
  const urgent = el("input", { id: "records-urgent", name: "urgent", type: "checkbox" });
  const clear = el("button", { class: "button", type: "button", text: "Clear filters" });
  status.value = state.status;
  type.value = state.type;
  urgent.checked = state.urgent;
  return { search, status, type, urgent, clear };
};

// assembles the toolbar form around the controls
const toolbarForm = (controls) => el("form", {
  class: "records-toolbar", role: "search", "aria-label": "Appointment filters", novalidate: true
}, [
  el("div", { class: "field toolbar-search" }, [
    el("label", { for: controls.search.id, text: "Search by patient or clinician" }), controls.search,
    el("p", { class: "field-hint", id: "records-search-hint", text: "Search matches patient names and clinicians." })
  ]),
  el("div", { class: "field" }, [el("label", { for: controls.status.id, text: "Status" }), controls.status]),
  el("div", { class: "field" }, [el("label", { for: controls.type.id, text: "Type" }), controls.type]),
  el("div", { class: "field checkbox-field" }, [el("label", { for: controls.urgent.id }, [controls.urgent, el("span", { text: "Urgent only" })])]),
  el("div", { class: "toolbar-actions" }, [controls.clear])
]);

// wires the events that rerun the filters when a control changes
const wireToolbar = (state, controls, toolbar, onFilter, onClear) => {
  let searchTimer;
  controls.search.addEventListener("input", () => {
    state.search = controls.search.value;
    window.clearTimeout(searchTimer); searchTimer = window.setTimeout(onFilter, 200);
  });
  controls.status.addEventListener("change", () => { state.status = controls.status.value; onFilter(); });
  controls.type.addEventListener("change", () => { state.type = controls.type.value; onFilter(); });
  controls.urgent.addEventListener("change", () => { state.urgent = controls.urgent.checked; onFilter(); });
  controls.clear.addEventListener("click", onClear);
  toolbar.addEventListener("submit", (event) => event.preventDefault());
};

// builds the toolbar and wires the events that rerun the filters
export const buildToolbar = (state, onFilter, onClear) => {
  const controls = buildControls(state);
  const toolbar = toolbarForm(controls);
  wireToolbar(state, controls, toolbar, onFilter, onClear);
  return { toolbar, search: controls.search, status: controls.status, type: controls.type, urgent: controls.urgent };
};
