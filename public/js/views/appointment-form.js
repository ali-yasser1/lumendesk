// renders the appointment form view and drives its loading, saving and repeat booking
import { announce, el, loadingMessage, showToast, statePanel } from "../ui.js";
import { createAppointment, getAppointments, getPatients, updateAppointment } from "../api.js";
import { formatDate } from "../format.js";
import { applyValues, buildForm, wireFields } from "./appointment-fields.js";
import { clearErrors, collectInvalid, extraErrors, mapServerErrors, messages, showSummary, toggleDynamic } from "./appointment-rules.js";

// shown when the edit link points at an appointment that no longer exists
const renderNotFound = (panel) => {
  panel.setAttribute("aria-busy", "false");
  panel.replaceChildren(statePanel("Appointment not found",
    "This appointment may have been deleted or the link may be out of date.",
    el("a", { class: "button button-primary", href: "#/records", text: "Go to records" })));
  announce("Appointment not found");
};

// shown when the form data cannot be fetched, the button retries the load
const renderLoadError = (panel, retry) => {
  panel.setAttribute("aria-busy", "false");
  panel.replaceChildren(statePanel("We could not load the appointment form",
    "Check the connection and try again.",
    el("button", { class: "button button-primary", type: "button", onClick: retry, text: "Try again" }),
    "error-state"));
  showToast("The appointment form could not load.", "error");
};

// collects the typed values into the object sent to the server
const payload = (fields) => ({
  patient_id: Number(fields.patient.value), date: fields.date.value, time: fields.time.value,
  type: fields.type.value, clinician: fields.clinician.value.trim(), urgent: fields.urgent.checked,
  status: fields.statusInputs.find((input) => input.checked)?.value || "",
  telehealth_link: fields.telehealthInput.value.trim(), followup_ref: fields.followupInput.value.trim(),
  notes: fields.notes.value.trim()
});

// marks the form busy and swaps the pressed submit button to a saving label
const setSaving = (fields, active, button) => {
  fields.form.setAttribute("aria-busy", String(active));
  fields.save.disabled = active;
  fields.saveRecords.disabled = active;
  if (!active) {
    fields.save.textContent = "Save appointment";
    fields.saveRecords.textContent = "Save and go to records";
    return;
  }
  button.replaceChildren(el("span", { class: "spinner", "aria-hidden": "true" }), document.createTextNode("Saving..."));
  announce("Saving appointment");
};

// resets most fields so another appointment can be booked at once
const resetForRepeat = (fields) => {
  fields.patient.value = "";
  fields.time.value = "";
  fields.notes.value = "";
  fields.urgent.checked = false;
  fields.telehealthInput.value = "";
  fields.followupInput.value = "";
  toggleDynamic(fields, false);
  clearErrors(fields);
  fields.updateCounter();
  fields.patient.focus();
};

// sends the payload, stores the result and follows the chosen destination
const saveAppointment = async (destination, submitter, context, fields) => {
  context.saving = true;
  setSaving(fields, true, submitter || fields.save);
  try {
    const saved = context.editing ? await updateAppointment(context.appointmentId, payload(fields)) : await createAppointment(payload(fields));
    const index = context.appointments.findIndex((item) => item.id === saved.id);
    if (index >= 0) { context.appointments[index] = saved; } else { context.appointments.push(saved); }
    const text = `Appointment saved for ${saved.patient_name} on ${formatDate(saved.date)}`;
    showToast(text, "success");
    announce(text);
    context.saving = false;
    setSaving(fields, false);
    if (context.editing || destination === "records") {
      window.setTimeout(() => (location.hash = "#/records"), 300);
    } else {
      resetForRepeat(fields);
    }
  } catch (error) {
    context.saving = false;
    setSaving(fields, false);
    if (error.errors) {
      mapServerErrors(fields, error);
    } else {
      showToast("The appointment could not be saved. Check your connection and try again.", "error");
    }
  }
};

// validates the form then saves it when nothing is invalid
const handleSubmit = async (event, context, fields) => {
  event.preventDefault();
  if (context.saving) { return; }
  fields.summary.hidden = true;
  const invalid = collectInvalid(fields);
  if (invalid.length > 0) { return showSummary(fields, invalid, messages); }
  const extra = extraErrors(fields, context.appointments, context.appointmentId);
  if (extra.invalid.length > 0) { return showSummary(fields, extra.invalid, extra.fieldMessages); }
  saveAppointment(event.submitter?.value || "stay", event.submitter, context, fields);
};

// assembles the form, fills it for the current mode and wires its events
const renderForm = (panel, context) => {
  const fields = buildForm(context.patients, context.appointments);
  applyValues(fields, context.appointment);
  toggleDynamic(fields, false);
  fields.updateCounter();
  wireFields(fields);
  fields.form.addEventListener("submit", (event) => handleSubmit(event, context, fields));
  panel.setAttribute("aria-busy", "false");
  panel.replaceChildren(fields.form);
};

// loads the patients and appointments then renders the form
const load = async (panel, context) => {
  panel.setAttribute("aria-busy", "true");
  panel.replaceChildren(loadingMessage("Loading..."));
  announce("Loading appointment form");
  try {
    const [appointments, patients] = await Promise.all([getAppointments(), getPatients()]);
    if (!panel.isConnected) { return; }
    context.appointments = appointments;
    context.patients = patients;
    context.appointment = context.editing ? appointments.find((item) => item.id === context.appointmentId) : null;
    if (context.editing && !context.appointment) {
      return renderNotFound(panel);
    }
    renderForm(panel, context);
  } catch (error) {
    if (panel.isConnected) {
      renderLoadError(panel, () => load(panel, context));
    }
  }
};

// builds the appointment form view shell and starts loading its data
export const renderAppointmentForm = (main, appointmentId = null) => {
  const editing = Number.isInteger(appointmentId) && appointmentId > 0;
  const context = { appointmentId, editing, saving: false, appointments: [], patients: [], appointment: null };
  const panel = el("div", { class: "form-panel", "aria-busy": "true" });
  main.append(
    el("div", { class: "view form-view" }, [
      el("header", { class: "view-header" }, [
        el("h1", { id: "appointment-title", text: editing ? "Edit appointment" : "New appointment" }),
        el("p", { class: "view-subtitle", text: editing ? "Update the details for this appointment." : "Book a visit and keep the schedule tidy." })
      ]),
      panel
    ])
  );
  load(panel, context);
};
