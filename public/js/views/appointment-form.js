import { announce, el, showToast } from "../ui.js";
import { buildSummary, setFieldError } from "../form.js";
import { createAppointment, getAppointments, getPatients, updateAppointment } from "../api.js";

const types = ["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"];
const statuses = ["Scheduled", "Completed", "Cancelled", "No-show"];

const messages = {
  patient: "Choose a patient",
  date: "Enter a date",
  time: "Enter a time",
  type: "Choose an appointment type",
  clinician: "Enter the clinician's name",
  status: "Choose a status",
  telehealth_link: "Enter a link starting with https://",
  followup_ref: "Enter the previous appointment reference",
  notes: "Keep notes to 500 characters or fewer"
};

const formatDate = (value) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric"
}).format(new Date(`${value}T00:00:00`));

const formatTime = (value) => {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(2000, 0, 1, hour, minute));
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const hint = (id, text) => el("p", { class: "field-hint", id, text });

const field = (labelText, control, hintNode) => el("div", { class: "field" }, [
  el("label", { for: control.id, text: labelText }),
  control,
  hintNode
]);

export const renderAppointmentForm = (main, appointmentId = null) => {
  const editing = Number.isInteger(appointmentId) && appointmentId > 0;
  const panel = el("div", { class: "form-panel", "aria-busy": "true" });

  const renderNotFound = () => {
    panel.setAttribute("aria-busy", "false");
    panel.replaceChildren(el("div", { class: "state-panel" }, [
      el("h2", { text: "Appointment not found" }),
      el("p", { text: "This appointment may have been deleted or the link may be out of date." }),
      el("a", { class: "button button-primary", href: "#/records", text: "Go to records" })
    ]));
    announce("Appointment not found");
  };

  const renderLoadError = () => {
    panel.setAttribute("aria-busy", "false");
    panel.replaceChildren(el("div", { class: "state-panel error-state" }, [
      el("h2", { text: "We could not load the appointment form" }),
      el("p", { text: "Check the connection and try again." }),
      el("button", { class: "button button-primary", type: "button", onClick: load, text: "Try again" })
    ]));
    showToast("The appointment form could not load.", "error");
  };

  const load = async () => {
    panel.setAttribute("aria-busy", "true");
    panel.replaceChildren(el("div", { class: "form-skeleton", "aria-hidden": "true" }, [
      el("div", { class: "skeleton-card" }),
      el("div", { class: "skeleton-card" }),
      el("div", { class: "skeleton-card" })
    ]));
    announce("Loading appointment form");
    try {
      const [appointments, patients] = await Promise.all([getAppointments(), getPatients()]);
      if (!panel.isConnected) {
        return;
      }
      const appointment = editing ? appointments.find((item) => item.id === appointmentId) : null;
      if (editing && !appointment) {
        renderNotFound();
        return;
      }
      panel.setAttribute("aria-busy", "false");
      renderForm(panel, appointments, patients, appointment);
    } catch (error) {
      if (panel.isConnected) {
        renderLoadError();
      }
    }
  };

  const renderForm = (container, appointments, patients, appointment) => {
    const summary = el("div", { class: "error-summary", role: "alert", tabindex: "-1", hidden: true });
    const patient = el("select", {
      id: "patient",
      name: "patient_id",
      required: true,
      "aria-describedby": "patient-hint"
    }, [
      el("option", { value: "", text: "Choose a patient" }),
      ...patients.map((item) => el("option", { value: String(item.id), text: item.name }))
    ]);
    const date = el("input", {
      id: "date",
      name: "date",
      type: "date",
      required: true,
      "aria-describedby": "date-hint"
    });
    const time = el("input", {
      id: "time",
      name: "time",
      type: "time",
      required: true,
      "aria-describedby": "time-hint"
    });
    const type = el("select", {
      id: "type",
      name: "type",
      required: true,
      "aria-describedby": "type-hint"
    }, [
      el("option", { value: "", text: "Choose a type" }),
      ...types.map((item) => el("option", { value: item, text: item }))
    ]);
    const clinician = el("input", {
      id: "clinician",
      name: "clinician",
      type: "text",
      autocomplete: "off",
      required: true,
      list: "clinician-list",
      "aria-describedby": "clinician-hint"
    });
    const clinicians = [...new Set(appointments.map((item) => item.clinician))].sort((a, b) => a.localeCompare(b));
    const clinicianList = el("datalist", { id: "clinician-list" }, clinicians.map((name) => el("option", { value: name })));
    const statusInputs = statuses.map((status) => el("input", {
      id: `status-${slug(status)}`,
      name: "status",
      type: "radio",
      value: status,
      required: true,
      "aria-describedby": "status-hint"
    }));
    const statusField = el("fieldset", { class: "field radio-fieldset" }, [
      el("legend", { text: "Status" }),
      hint("status-hint", "Scheduled visits cannot be in the past."),
      el("div", { class: "radio-group" }, statusInputs.map((input, index) => el("label", {
        class: "radio-option",
        for: input.id
      }, [input, statuses[index]])))
    ]);
    const urgent = el("input", {
      id: "urgent",
      name: "urgent",
      type: "checkbox",
      "aria-describedby": "urgent-hint"
    });
    const notes = el("textarea", {
      id: "notes",
      name: "notes",
      rows: "5",
      maxlength: "500",
      "aria-describedby": "notes-hint notes-counter"
    });
    const counter = el("p", { class: "field-hint char-counter", id: "notes-counter", text: "500 characters left" });
    const telehealth = el("input", {
      id: "telehealth_link",
      name: "telehealth_link",
      type: "url",
      "aria-describedby": "telehealth-hint"
    });
    const telehealthField = el("div", { class: "field", hidden: true }, [
      el("label", { for: telehealth.id, text: "Telehealth link" }),
      telehealth,
      hint("telehealth-hint", "Include the full meeting URL, starting with https://.")
    ]);
    const followup = el("input", {
      id: "followup_ref",
      name: "followup_ref",
      type: "text",
      autocomplete: "off",
      "aria-describedby": "followup-hint"
    });
    const followupField = el("div", { class: "field", hidden: true }, [
      el("label", { for: followup.id, text: "Previous appointment reference" }),
      followup,
      hint("followup-hint", "Use the reference from the previous appointment.")
    ]);
    const save = el("button", { class: "button button-primary", type: "submit", name: "destination", value: "stay", text: "Save appointment" });
    const saveRecords = el("button", { class: "button", type: "submit", name: "destination", value: "records", text: "Save and go to records" });
    const allFields = [patient, date, time, type, clinician, telehealth, followup, notes];
    let saving = false;
    let lastCount = null;

    const updateCounter = () => {
      const left = 500 - notes.value.length;
      counter.textContent = `${left} ${left === 1 ? "character" : "characters"} left`;
      if ([50, 20, 0].includes(left) && left !== lastCount) {
        announce(`${left} characters left`);
      }
      lastCount = [50, 20, 0].includes(left) ? left : null;
    };

    const isHidden = (input) => Boolean(input.closest("[hidden]"));

    const validateField = (input) => {
      if (isHidden(input)) {
        setFieldError(input, "");
        return false;
      }
      let message = "";
      if (input.id === "telehealth_link" && !/^https:\/\//i.test(input.value.trim())) {
        message = messages.telehealth_link;
      } else if (input.required && !input.value.trim()) {
        message = messages[input.id];
      } else if (input.id === "notes" && input.value.length > 500) {
        message = messages.notes;
      }
      setFieldError(input, message);
      return Boolean(message);
    };

    const validateStatus = () => {
      const checked = statusInputs.some((input) => input.checked);
      setFieldError(statusInputs[0], checked ? "" : "Choose a status");
      return checked ? null : statusInputs[0];
    };

    const toggleDynamic = (withAnnouncement = true) => {
      const telehealthChanged = telehealthField.hidden !== (type.value !== "Telehealth");
      telehealthField.hidden = type.value !== "Telehealth";
      telehealth.required = !telehealthField.hidden;
      if (telehealthField.hidden) {
        telehealth.value = "";
        setFieldError(telehealth, "");
      }
      const followupChanged = followupField.hidden !== (type.value !== "Follow-up");
      followupField.hidden = type.value !== "Follow-up";
      followup.required = !followupField.hidden;
      if (followupField.hidden) {
        followup.value = "";
        setFieldError(followup, "");
      }
      if (withAnnouncement && telehealthChanged) {
        announce(`Telehealth link field ${telehealthField.hidden ? "removed" : "added"}`);
      } else if (withAnnouncement && followupChanged) {
        announce(`Previous appointment reference field ${followupField.hidden ? "removed" : "added"}`);
      }
    };

    const clearErrors = () => {
      allFields.forEach((input) => setFieldError(input, ""));
      setFieldError(statusInputs[0], "");
      summary.hidden = true;
    };

    const showSummary = (fields, fieldMessages) => {
      summary.replaceChildren(...buildSummary(fields, fieldMessages));
      summary.hidden = false;
      summary.focus();
    };

    const extraErrors = () => {
      const invalid = [];
      const fieldMessages = { ...messages };
      const status = statusInputs.find((input) => input.checked)?.value;
      if (status === "Scheduled" && date.value && time.value) {
        const when = new Date(`${date.value}T${time.value}:00`);
        if (when < new Date()) {
          const message = "Scheduled appointments cannot be in the past. Change the date or set the status to Completed";
          setFieldError(date, message);
          fieldMessages.date = message;
          invalid.push(date);
        }
      }
      if (date.value && time.value && clinician.value.trim()) {
        const conflict = appointments.find((item) => (
          item.id !== appointment?.id &&
          item.date === date.value &&
          item.time === time.value &&
          item.clinician.toLowerCase() === clinician.value.trim().toLowerCase()
        ));
        if (conflict) {
          const message = `${clinician.value.trim()} already has an appointment at ${formatTime(time.value)} on ${formatDate(date.value)}`;
          setFieldError(time, message);
          fieldMessages.time = message;
          invalid.push(time);
        }
      }
      return { invalid, fieldMessages };
    };

    const setSaving = (active, button) => {
      form.setAttribute("aria-busy", String(active));
      [save, saveRecords].forEach((item) => {
        item.disabled = active;
      });
      if (active) {
        button.replaceChildren(
          el("span", { class: "spinner", "aria-hidden": "true" }),
          document.createTextNode("Saving...")
        );
        announce("Saving appointment");
      } else {
        save.textContent = "Save appointment";
        saveRecords.textContent = "Save and go to records";
      }
    };

    const payload = () => ({
      patient_id: Number(patient.value),
      date: date.value,
      time: time.value,
      type: type.value,
      clinician: clinician.value.trim(),
      status: statusInputs.find((input) => input.checked)?.value || "",
      urgent: urgent.checked,
      telehealth_link: telehealth.value.trim(),
      followup_ref: followup.value.trim(),
      notes: notes.value.trim()
    });

    const resetForRepeat = () => {
      patient.value = "";
      time.value = "";
      notes.value = "";
      urgent.checked = false;
      telehealth.value = "";
      followup.value = "";
      toggleDynamic(false);
      clearErrors();
      updateCounter();
      patient.focus();
    };

    const mapServerErrors = (error) => {
      const fields = {
        patient_id: patient,
        date,
        time,
        type,
        clinician,
        status: statusInputs[0],
        notes
      };
      const invalid = [];
      const fieldMessages = {};
      Object.entries(error.errors).forEach(([key, message]) => {
        const input = fields[key];
        if (!input) {
          return;
        }
        setFieldError(input, message);
        invalid.push(input);
        fieldMessages[input.id] = message;
      });
      if (invalid.length > 0) {
        showSummary(invalid, fieldMessages);
      } else {
        showToast("The appointment could not be saved.", "error");
      }
    };

    const form = el("form", { class: "appointment-form glass", novalidate: true }, [
      summary,
      el("fieldset", { class: "form-section" }, [
        el("legend", { text: "Patient and visit" }),
        el("div", { class: "form-grid" }, [
          field("Patient", patient, hint("patient-hint", "Select the patient this visit is for.")),
          field("Date", date, hint("date-hint", "Use the date picker or type YYYY-MM-DD.")),
          field("Time", time, hint("time-hint", "Use 24-hour time, for example 14:30.")),
          field("Appointment type", type, hint("type-hint", "Telehealth and Follow-up add an extra required field.")),
          field("Clinician", clinician, hint("clinician-hint", "Start typing to reuse a clinician from the schedule.")),
          clinicianList,
          statusField,
          el("div", { class: "field checkbox-field" }, [
            el("label", { for: urgent.id }, [urgent, el("span", { text: "Mark as urgent" })]),
            hint("urgent-hint", "Urgent visits are highlighted in the records table.")
          ])
        ])
      ]),
      el("fieldset", { class: "form-section" }, [
        el("legend", { text: "Details" }),
        el("p", { class: "field-hint", text: "Choose Telehealth or Follow-up to add the matching detail." }),
        telehealthField,
        followupField
      ]),
      el("fieldset", { class: "form-section" }, [
        el("legend", { text: "Notes" }),
        el("div", { class: "field" }, [
          el("label", { for: notes.id, text: "Notes" }),
          notes,
          hint("notes-hint", "Up to 500 characters."),
          counter
        ])
      ]),
      el("div", { class: "form-actions" }, [save, saveRecords])
    ]);

    if (appointment) {
      patient.value = String(appointment.patient_id);
      date.value = appointment.date;
      time.value = appointment.time;
      type.value = appointment.type;
      clinician.value = appointment.clinician;
      statusInputs.forEach((input) => {
        input.checked = input.value === appointment.status;
      });
      urgent.checked = Boolean(appointment.urgent);
      notes.value = appointment.notes;
      telehealth.value = appointment.telehealth_link || "";
      followup.value = appointment.followup_ref || "";
    } else {
      date.value = today();
      statusInputs[0].checked = true;
    }

    toggleDynamic(false);
    updateCounter();

    allFields.forEach((input) => {
      input.addEventListener("blur", () => validateField(input));
      input.addEventListener("input", () => {
        if (input.value.trim()) {
          setFieldError(input, "");
        }
      });
    });
    patient.addEventListener("change", () => setFieldError(patient, ""));
    type.addEventListener("change", () => {
      setFieldError(type, "");
      toggleDynamic();
    });
    statusInputs.forEach((input) => input.addEventListener("change", () => {
      setFieldError(statusInputs[0], "");
      if (date.value) {
        setFieldError(date, "");
      }
    }));
    notes.addEventListener("input", updateCounter);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (saving) {
        return;
      }
      summary.hidden = true;
      const invalid = allFields.filter((input) => validateField(input));
      const statusInvalid = validateStatus();
      if (statusInvalid) {
        invalid.push(statusInvalid);
      }
      if (invalid.length === 0) {
        const extra = extraErrors();
        invalid.push(...extra.invalid);
        if (invalid.length > 0) {
          showSummary(invalid, extra.fieldMessages);
          return;
        }
      } else {
        showSummary(invalid, messages);
        return;
      }
      const destination = event.submitter?.value || "stay";
      saving = true;
      setSaving(true, event.submitter || save);
      try {
        const saved = editing
          ? await updateAppointment(appointmentId, payload())
          : await createAppointment(payload());
        const index = appointments.findIndex((item) => item.id === saved.id);
        if (index >= 0) {
          appointments[index] = saved;
        } else {
          appointments.push(saved);
        }
        const text = `Appointment saved for ${saved.patient_name} on ${formatDate(saved.date)}`;
        showToast(text, "success");
        announce(text);
        saving = false;
        setSaving(false);
        if (editing || destination === "records") {
          window.setTimeout(() => {
            location.hash = "#/records";
          }, 300);
        } else {
          resetForRepeat();
        }
      } catch (error) {
        saving = false;
        setSaving(false);
        if (error.errors) {
          mapServerErrors(error);
        } else {
          showToast("The appointment could not be saved. Check your connection and try again.", "error");
        }
      }
    });

    container.replaceChildren(form);
  };

  main.append(
    el("div", { class: "view form-view" }, [
      el("header", { class: "view-header" }, [
        el("h1", { id: "appointment-title", text: editing ? "Edit appointment" : "New appointment" }),
        el("p", {
          class: "view-subtitle",
          text: editing ? "Update the details for this appointment." : "Book a visit and keep the schedule tidy."
        })
      ]),
      panel
    ])
  );

  load();
};
