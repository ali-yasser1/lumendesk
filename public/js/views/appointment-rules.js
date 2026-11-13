// validation rules and dynamic field behaviour for the appointment form
import { announce, showMessage } from "../ui.js";
import { buildSummary, setFieldError } from "../form.js";
import { formatDate, formatTime } from "../format.js";

// the notice shown when the typed name is a new patient
export const newPatientNoteText = "New patient. You can add a phone number or other contact details in Notes if you have them. This is optional.";

// the messages shown for each invalid field
export const messages = {
  patient_name: "Enter the patient's name",
  date: "Enter a date", time: "Enter a time", type: "Choose an appointment type",
  clinician: "Enter the clinician's name", status: "Choose a status",
  notes: "Keep notes to 500 characters or fewer"
};

// the id of the new patient notice linked to the name input
const noteId = "new-patient-note";

// returns the validation message for one input
const messageFor = (input) => {
  if (input.required && !input.value.trim()) { return messages[input.id]; }
  if (input.id === "notes" && input.value.length > 500) { return messages.notes; }
  return "";
};

// validates one input and shows or clears its inline error
export const validateField = (input) => {
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

// adds or removes the notice id from the name input description
const setNoteDescription = (input, visible) => {
  const ids = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).filter((id) => id !== noteId);
  if (visible) { ids.push(noteId); }
  if (ids.length > 0) { input.setAttribute("aria-describedby", ids.join(" ")); }
  else { input.removeAttribute("aria-describedby"); }
};

// shows the notice only when the typed name is not an existing patient
export const toggleNewPatientNote = (fields, withAnnouncement = true) => {
  const value = fields.patient.value.trim().toLowerCase();
  const visible = value !== "" && !isKnownPatient(fields, value);
  const changed = fields.patientNote.hidden !== !visible;
  fields.patientNote.hidden = !visible;
  setNoteDescription(fields.patient, visible);
  if (withAnnouncement && changed && visible) { announce(newPatientNoteText); }
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
    patient_name: fields.patient, date: fields.date, time: fields.time, type: fields.type,
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
