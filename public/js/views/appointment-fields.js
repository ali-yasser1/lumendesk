// builds the appointment form inputs, sections and their value helpers
import { announce, el } from "../ui.js";
import { today } from "../format.js";
import { setFieldError } from "../form.js";
import { toggleDynamic, validateField } from "./appointment-rules.js";

const types = ["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"];
const statuses = ["Scheduled", "Completed", "Cancelled", "No-show"];

// builds a small hint paragraph linked to its input with aria describedby
const hint = (id, text) => el("p", { class: "field-hint", id, text });

// wraps a control with its label, hint and any extra children
const field = (labelText, control, hintNode, extra = []) => el("div", { class: "field" }, [
  el("label", { for: control.id, text: labelText }), control, hintNode, ...extra
]);

// builds the status radios inside a fieldset with a legend
const buildStatusField = () => {
  const inputs = statuses.map((status) => el("input", {
    id: `status-${status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: "status", type: "radio", value: status,
    required: true, "aria-describedby": "status-hint"
  }));
  const node = el("fieldset", { class: "field radio-fieldset" }, [
    el("legend", { text: "Status" }), hint("status-hint", "Scheduled visits cannot be in the past."),
    el("div", { class: "radio-group" }, inputs.map((input, index) =>
      el("label", { class: "radio-option", for: input.id }, [input, statuses[index]])))]);
  return { inputs, node };
};

// builds one field that only some visit types need, hidden until then
const buildHiddenField = (spec) => {
  const input = el("input", { id: spec.id, name: spec.id, type: spec.type, autocomplete: spec.autocomplete, "aria-describedby": spec.hintId });
  const node = el("div", { class: "field", hidden: true }, [
    el("label", { for: spec.id, text: spec.label }), input, hint(spec.hintId, spec.hintText)
  ]);
  return { input, node };
};

// creates the counter update function with its own announce memory
const counterUpdater = (notes, counter) => {
  let lastCount = null;
  return () => {
    const left = 500 - notes.value.length;
    counter.textContent = `${left} ${left === 1 ? "character" : "characters"} left`;
    if ([50, 20, 0].includes(left) && left !== lastCount) { announce(`${left} characters left`); }
    lastCount = [50, 20, 0].includes(left) ? left : null;
  };
};

// creates the patient, date, time, type, clinician, urgent and notes inputs
const createInputs = (patients, appointments) => {
  const patient = el("select", { id: "patient", name: "patient_id", required: true, "aria-describedby": "patient-hint" }, [
    el("option", { value: "", text: "Choose a patient" }), ...patients.map((item) => el("option", { value: String(item.id), text: item.name }))
  ]);
  const date = el("input", { id: "date", name: "date", type: "date", required: true, "aria-describedby": "date-hint" });
  const time = el("input", { id: "time", name: "time", type: "time", required: true, "aria-describedby": "time-hint" });
  const type = el("select", { id: "type", name: "type", required: true, "aria-describedby": "type-hint" }, [
    el("option", { value: "", text: "Choose a type" }), ...types.map((item) => el("option", { value: item, text: item }))
  ]);
  const clinician = el("input", {
    id: "clinician", name: "clinician", type: "text", autocomplete: "off", required: true,
    list: "clinician-list", "aria-describedby": "clinician-hint"
  });
  const names = [...new Set(appointments.map((item) => item.clinician))].sort((a, b) => a.localeCompare(b));
  const clinicianList = el("datalist", { id: "clinician-list" }, names.map((name) => el("option", { value: name })));
  const urgent = el("input", { id: "urgent", name: "urgent", type: "checkbox", "aria-describedby": "urgent-hint" });
  const notes = el("textarea", { id: "notes", name: "notes", rows: "5", maxlength: "500", "aria-describedby": "notes-hint notes-counter" });
  const counter = el("p", { class: "field-hint char-counter", id: "notes-counter", text: "500 characters left" });
  return { patient, date, time, type, clinician, clinicianList, urgent, notes, counter, updateCounter: counterUpdater(notes, counter) };
};

// builds the patient and visit section with its grid of fields
const buildMainSection = (inputs, status) => el("fieldset", { class: "form-section" }, [
  el("legend", { text: "Patient and visit" }),
  el("div", { class: "form-grid" }, [
    field("Patient", inputs.patient, hint("patient-hint", "Select the patient this visit is for.")),
    field("Date", inputs.date, hint("date-hint", "Use the date picker or type YYYY-MM-DD.")),
    field("Time", inputs.time, hint("time-hint", "Use 24-hour time, for example 14:30.")),
    field("Appointment type", inputs.type, hint("type-hint", "Telehealth and Follow-up add an extra required field.")),
    field("Clinician", inputs.clinician, hint("clinician-hint", "Start typing to reuse a clinician from the schedule.")),
    inputs.clinicianList,
    status.node,
    el("div", { class: "field checkbox-field" }, [
      el("label", { for: inputs.urgent.id }, [inputs.urgent, el("span", { text: "Mark as urgent" })]),
      hint("urgent-hint", "Urgent visits are highlighted in the records table.")])
  ])
]);

// builds the details section that holds the type specific fields
const buildDetailsSection = (telehealth, followup) => el("fieldset", { class: "form-section" }, [
  el("legend", { text: "Details" }),
  el("p", { class: "field-hint", text: "Choose Telehealth or Follow-up to add the matching detail." }),
  telehealth.node,
  followup.node
]);

// builds the notes section with the character counter
const buildNotesSection = (inputs) => el("fieldset", { class: "form-section" }, [
  el("legend", { text: "Notes" }),
  field("Notes", inputs.notes, hint("notes-hint", "Up to 500 characters."), [inputs.counter])
]);

// puts an existing appointment into the inputs, or the defaults for a new one
export const applyValues = (fields, appointment) => {
  if (!appointment) { fields.date.value = today(); fields.statusInputs[0].checked = true; return; }
  fields.patient.value = String(appointment.patient_id);
  fields.date.value = appointment.date; fields.time.value = appointment.time;
  fields.type.value = appointment.type; fields.clinician.value = appointment.clinician;
  fields.statusInputs.forEach((input) => { input.checked = input.value === appointment.status; });
  fields.urgent.checked = Boolean(appointment.urgent); fields.notes.value = appointment.notes;
  fields.telehealthInput.value = appointment.telehealth_link || "";
  fields.followupInput.value = appointment.followup_ref || "";
};

// wires the blur, input and change behaviour of every field
export const wireFields = (fields) => {
  fields.allFields.forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => { if (input.value.trim()) { setFieldError(input, ""); } });
  });
  fields.patient.addEventListener("change", () => setFieldError(fields.patient, ""));
  fields.type.addEventListener("change", () => { setFieldError(fields.type, ""); toggleDynamic(fields); });
  fields.statusInputs.forEach((input) => input.addEventListener("change", () => {
    setFieldError(fields.statusInputs[0], ""); if (fields.date.value) { setFieldError(fields.date, ""); } }));
  fields.notes.addEventListener("input", fields.updateCounter);
};

// creates every control, assembles the sections and returns the fields
export const buildForm = (patients, appointments) => {
  const summary = el("div", { class: "error-summary", role: "alert", tabindex: "-1", hidden: true });
  const inputs = createInputs(patients, appointments);
  const status = buildStatusField();
  const telehealth = buildHiddenField({ id: "telehealth_link", type: "url", label: "Telehealth link", hintId: "telehealth-hint", hintText: "Include the full meeting URL, starting with https://." });
  const followup = buildHiddenField({ id: "followup_ref", type: "text", autocomplete: "off", label: "Previous appointment reference", hintId: "followup-hint", hintText: "Use the reference from the previous appointment." });
  const save = el("button", { class: "button button-primary", type: "submit", name: "destination", value: "stay", text: "Save appointment" });
  const saveRecords = el("button", { class: "button", type: "submit", name: "destination", value: "records", text: "Save and go to records" });
  const form = el("form", { class: "appointment-form", novalidate: true }, [
    summary, buildMainSection(inputs, status), buildDetailsSection(telehealth, followup),
    buildNotesSection(inputs), el("div", { class: "form-actions" }, [save, saveRecords])]);
  const allFields = [inputs.patient, inputs.date, inputs.time, inputs.type, inputs.clinician, telehealth.input, followup.input, inputs.notes];
  const linked = { telehealthInput: telehealth.input, telehealthField: telehealth.node, followupInput: followup.input, followupField: followup.node };
  return { ...inputs, form, summary, save, saveRecords, allFields, statusInputs: status.inputs, ...linked };
};
