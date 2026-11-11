// filter, sort, saved state and toolbar logic for the records view
import { el } from "../ui.js";

const storageKey = "lumen-records";

// the choices offered by the filter toolbar and the saved state
export const statuses = ["Scheduled", "Completed", "Cancelled", "No-show"];
export const types = ["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"];
export const sortLabels = {
  patient: "Patient",
  date: "Date",
  time: "Time",
  type: "Type",
  clinician: "Clinician",
  status: "Status"
};

const defaults = {
  search: "",
  status: "",
  type: "",
  urgent: false,
  sortKey: "date",
  sortDir: "desc"
};

// reads the saved filter state and falls back to defaults for unknown values
export const readState = () => {
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
      sortKey: sortLabels[saved.sortKey] ? saved.sortKey : defaults.sortKey,
      sortDir: saved.sortDir === "asc" ? "asc" : "desc"
    };
  } catch (error) {
    return { ...defaults };
  }
};

// saves the filter state so it survives moving between views
export const saveState = (state) => {
  sessionStorage.setItem(storageKey, JSON.stringify(state));
};

// resets the saved state and the toolbar controls back to their defaults
export const resetControls = (state, controls) => {
  state.search = "";
  state.status = "";
  state.type = "";
  state.urgent = false;
  controls.search.value = "";
  controls.status.value = "";
  controls.type.value = "";
  controls.urgent.checked = false;
  saveState(state);
};

// checks one appointment against the search text and the active filters
const matches = (appointment, state) => {
  const query = state.search.trim().toLowerCase();
  const patient = appointment.patient_name.toLowerCase();
  const clinician = appointment.clinician.toLowerCase();
  return (!query || patient.includes(query) || clinician.includes(query)) &&
    (!state.status || appointment.status === state.status) &&
    (!state.type || appointment.type === state.type) &&
    (!state.urgent || appointment.urgent);
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
    const result = sortValue(a, state.sortKey)
      .localeCompare(sortValue(b, state.sortKey), "en", { numeric: true });
    if (result !== 0) {
      return result * direction;
    }
    return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.id - b.id;
  });
};

// builds the toolbar and wires the events that rerun the filters
export const buildToolbar = (state, onFilter, onClear) => {
  const search = el("input", {
    id: "records-search", name: "search", type: "search", value: state.search,
    autocomplete: "off", "aria-describedby": "records-search-hint"
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
  const toolbar = el("form", {
    class: "records-toolbar glass", role: "search",
    "aria-label": "Appointment filters", novalidate: true
  }, [
    el("div", { class: "field toolbar-search" }, [
      el("label", { for: search.id, text: "Search by patient or clinician" }),
      search,
      el("p", { class: "field-hint", id: "records-search-hint", text: "Search matches patient names and clinicians." })
    ]),
    el("div", { class: "field" }, [el("label", { for: status.id, text: "Status" }), status]),
    el("div", { class: "field" }, [el("label", { for: type.id, text: "Type" }), type]),
    el("div", { class: "field checkbox-field" }, [
      el("label", { for: urgent.id }, [urgent, el("span", { text: "Urgent only" })])
    ]),
    el("div", { class: "toolbar-actions" }, [clear])
  ]);
  status.value = state.status;
  type.value = state.type;
  urgent.checked = state.urgent;
  let searchTimer;
  const wireSelect = (select, key) => select.addEventListener("change", () => {
    state[key] = select.value;
    saveState(state);
    onFilter();
  });
  search.addEventListener("input", () => {
    state.search = search.value;
    saveState(state);
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(onFilter, 200);
  });
  wireSelect(status, "status");
  wireSelect(type, "type");
  urgent.addEventListener("change", () => {
    state.urgent = urgent.checked;
    saveState(state);
    onFilter();
  });
  clear.addEventListener("click", onClear);
  toolbar.addEventListener("submit", (event) => event.preventDefault());
  return { toolbar, search, status, type, urgent };
};
