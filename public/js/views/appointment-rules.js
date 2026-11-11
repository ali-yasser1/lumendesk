// validation rules and dynamic field behaviour for the appointment form
import { announce, showMessage } from "../ui.js";
import { buildSummary, setFieldError } from "../form.js";
import { formatDate, formatTime } from "../format.js";

// the messages shown for each invalid field
export const messages = {
  patient: "Choose a patient", date: "Enter a date", time: "Enter a time", type: "Choose an appointment type",
  clinician: "Enter the clinician's name", status: "Choose a status",
  followup_ref: "Enter the previous appointment reference", notes: "Keep notes to 500 characters or fewer",
  telehealth_link: "Enter a link starting with https://"
};

// checks if a control sits inside a hidden field so it can be skipped
const isHidden = (input) => Boolean(input.closest("[hidden]"));

// validates one input and shows or clears its inline error
export const validateField = (input) => {
  if (isHidden(input)) { setFieldError(input, ""); return false; }
  let message = "";
  if (input.id === "telehealth_link" && !/^https:\/\//i.test(input.value.trim())) { message = messages.telehealth_link; }
  else if (input.required && !input.value.trim()) { message = messages[input.id]; }
  else if (input.id === "notes" && input.value.length > 500) { message = messages.notes; }
  setFieldError(input, message);
  return Boolean(message);
};

// checks that a status radio was picked and flags the group when not
export const validateStatus = (statusInputs) => {
  const checked = statusInputs.some((input) => input.checked);
  setFieldError(statusInputs[0], checked ? "" : "Choose a status");
  return checked ? null : statusInputs[0];
};

// shows or hides one dynamic field and clears it while it is hidden
const syncField = (fieldWrap, input, visible) => {
  const changed = fieldWrap.hidden !== !visible;
  fieldWrap.hidden = !visible;
  input.required = visible;
  if (!visible) { input.value = ""; setFieldError(input, ""); }
  return changed;
};

// shows the telehealth and follow up fields only for the matching visit type
export const toggleDynamic = (fields, withAnnouncement = true) => {
  const telehealthChanged = syncField(fields.telehealthField, fields.telehealthInput, fields.type.value === "Telehealth");
  const followupChanged = syncField(fields.followupField, fields.followupInput, fields.type.value === "Follow-up");
  if (!withAnnouncement) { return; }
  if (telehealthChanged) { announce(`Telehealth link field ${fields.telehealthField.hidden ? "removed" : "added"}`); }
  else if (followupChanged) { announce(`Previous appointment reference field ${fields.followupField.hidden ? "removed" : "added"}`); }
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

// validates every field and returns the list of invalid inputs
export const collectInvalid = (fields) => {
  const invalid = fields.allFields.filter((input) => validateField(input));
  const statusInvalid = validateStatus(fields.statusInputs);
  if (statusInvalid) { invalid.push(statusInvalid); }
  return invalid;
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
    patient_id: fields.patient, date: fields.date, time: fields.time, type: fields.type,
    clinician: fields.clinician, status: fields.statusInputs[0], notes: fields.notes
  };
  const invalid = [];
  const fieldMessages = {};
  for (const [key, message] of Object.entries(error.errors)) {
    const input = inputs[key];
    if (!input) { continue; }
    setFieldError(input, message); invalid.push(input); fieldMessages[input.id] = message;
  }
  if (invalid.length > 0) { showSummary(fields, invalid, fieldMessages); }
  else { showMessage("The appointment could not be saved.", "error"); }
};
