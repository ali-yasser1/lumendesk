// validation rules and dynamic field behaviour for the appointment form
import { announce, showMessage } from "../ui.js";
import { buildSummary, setFieldError } from "../form.js";
import { formatDate, formatTime } from "../format.js";

// the messages shown for each invalid field
export const messages = {
  patient_name: "Enter the patient's name",
  patient_phone: "Enter a phone number for the new patient",
  patient_phone_format: "Enter a valid phone number, for example 0100 123 4567",
  date: "Enter a date", time: "Enter a time", type: "Choose an appointment type",
  clinician: "Enter the clinician's name", status: "Choose a status",
  notes: "Keep notes to 500 characters or fewer"
};

// the characters and length accepted for a patient phone number
const phonePattern = /^[0-9 +()\-]{6,20}$/;

// checks if a control sits inside a hidden field so it can be skipped
const isHidden = (input) => Boolean(input.closest("[hidden]"));

// returns the validation message for one input
const messageFor = (input) => {
  if (input.id === "patient_phone") {
    const value = input.value.trim();
    if (!value) { return messages.patient_phone; }
    return phonePattern.test(value) ? "" : messages.patient_phone_format;
  }
  if (input.required && !input.value.trim()) { return messages[input.id]; }
  if (input.id === "notes" && input.value.length > 500) { return messages.notes; }
  return "";
};

// validates one input and shows or clears its inline error
export const validateField = (input) => {
  if (isHidden(input)) { setFieldError(input, ""); return ""; }
  const message = messageFor(input);
  setFieldError(input, message);
  return message;
};

// checks that a status radio was picked and flags the group when not
export const validateStatus = (statusInputs) => {
  const checked = statusInputs.some((input) => input.checked);
  setFieldError(statusInputs[0], checked ? "" : "Choose a status");
  return checked ? null : statusInputs[0];
};

// checks if the typed name matches a patient already in the list
const isKnownPatient = (fields, value) =>
  fields.patientNames.some((name) => name.trim().toLowerCase() === value);

// shows the phone field only when the typed name is not an existing patient
export const togglePhone = (fields, withAnnouncement = true) => {
  const value = fields.patient.value.trim().toLowerCase();
  const visible = value !== "" && !isKnownPatient(fields, value);
  const changed = fields.phoneField.hidden !== !visible;
  fields.phoneField.hidden = !visible;
  fields.phoneInput.required = visible;
  if (!visible) { fields.phoneInput.value = ""; setFieldError(fields.phoneInput, ""); }
  if (withAnnouncement && changed) {
    announce(`Phone number field ${visible ? "added" : "removed"}`);
  }
  return changed;
};

// rejects a scheduled visit that lies in the past
const checkPastDate = (fields, invalid, fieldMessages) => {
  const status = fields.statusInputs.find((input) => input.checked)?.value;
  const when = new Date(`${fields.date.value}T${fields.time.value}:00`);
  if (status === "Scheduled" && fields.date.value && fields.time.value && when < new Date()) {
    const message = "Scheduled appointments cannot be in the past. Change the date or set the status to Completed";
    setFieldError(fields.date, message); fieldMessages.date = message; invalid.push(fields.date);
  }
};

// rejects a second appointment for the same clinician in the same slot
const checkClash = (fields, appointments, editingId, invalid, fieldMessages) => {
  const name = fields.clinician.value.trim().toLowerCase();
  const clash = appointments.find((item) => item.id !== editingId && item.date === fields.date.value &&
    item.time === fields.time.value && item.clinician.toLowerCase() === name);
  if (!clash || !fields.date.value || !fields.time.value || !name) { return; }
  const message = `${fields.clinician.value.trim()} already has an appointment at ${formatTime(fields.time.value)} on ${formatDate(fields.date.value)}`;
  setFieldError(fields.time, message); fieldMessages.time = message; invalid.push(fields.time);
};

// runs the past date and clash checks the server cannot know about
export const extraErrors = (fields, appointments, editingId) => {
  const invalid = [];
  const fieldMessages = { ...messages };
  checkPastDate(fields, invalid, fieldMessages); checkClash(fields, appointments, editingId, invalid, fieldMessages);
  return { invalid, fieldMessages };
};

// clears every inline error and the error summary
export const clearErrors = (fields) => {
  fields.allFields.forEach((input) => setFieldError(input, "")); setFieldError(fields.statusInputs[0], "");
  fields.summary.hidden = true;
};

// validates every field and returns the invalid inputs with their messages
export const collectInvalid = (fields) => {
  const invalid = [];
  const fieldMessages = {};
  fields.allFields.forEach((input) => {
    const message = validateField(input);
    if (message) { invalid.push(input); fieldMessages[input.id] = message; }
  });
  const statusInvalid = validateStatus(fields.statusInputs);
  if (statusInvalid) { invalid.push(statusInvalid); fieldMessages.status = messages.status; }
  return { invalid, fieldMessages };
};

// shows the error summary and moves focus to it so it is read at once
export const showSummary = (fields, invalid, fieldMessages) => {
  fields.summary.replaceChildren(...buildSummary(invalid, fieldMessages));
  fields.summary.hidden = false;
  fields.summary.focus();
};

// maps server error keys back onto the inputs and shows the summary
export const mapServerErrors = (fields, error) => {
  const inputs = {
    patient_name: fields.patient, patient_phone: fields.phoneInput, date: fields.date, time: fields.time, type: fields.type,
    clinician: fields.clinician, status: fields.statusInputs[0], notes: fields.notes
  };
  const invalid = [];
  const fieldMessages = {};
  if (error.errors.patient_phone) {
    fields.phoneField.hidden = false;
    fields.phoneInput.required = true;
  }
  for (const [key, message] of Object.entries(error.errors)) {
    const input = inputs[key];
    if (!input) { continue; }
    setFieldError(input, message); invalid.push(input); fieldMessages[input.id] = message;
  }
  if (invalid.length > 0) { showSummary(fields, invalid, fieldMessages); }
  else { showMessage("The appointment could not be saved.", "error"); }
};
