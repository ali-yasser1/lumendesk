// express server that serves the appointment api and the static site
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./db.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

// the appointment types and statuses the api accepts
const types = new Set(["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"]);
const statuses = new Set(["Scheduled", "Completed", "Cancelled", "No-show"]);

// trims a value and returns an empty string when it is not text
const text = (value) => (typeof value === "string" ? value.trim() : "");

// checks that a value is a real calendar date in yyyy mm dd form
const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

// checks that a value is a time in hh mm form within the day
const isTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// finds a patient by name without caring about letter case
const findPatient = db.prepare("SELECT id FROM patients WHERE lower(name) = lower(?)");

// checks one appointment body and returns its errors and clean values
const validateAppointment = (input) => {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};

  const patientName = text(body.patient_name);

  if (!patientName) {
    errors.patient_name = "Enter the patient's name";
  } else if (patientName.length > 80) {
    errors.patient_name = "Patient name must be 80 characters or fewer";
  }

  const date = text(body.date);
  if (!isDate(date)) {
    errors.date = "Enter a valid date.";
  }

  const time = text(body.time);
  if (!isTime(time)) {
    errors.time = "Enter a valid time.";
  }

  const type = text(body.type);
  if (!types.has(type)) {
    errors.type = "Choose a valid appointment type.";
  }

  const clinician = text(body.clinician);
  if (!clinician) {
    errors.clinician = "Enter a clinician name.";
  } else if (clinician.length > 80) {
    errors.clinician = "Clinician name must be 80 characters or fewer.";
  }

  const status = text(body.status);
  if (!statuses.has(status)) {
    errors.status = "Choose a valid status.";
  }

  const notes = text(body.notes);
  if (notes.length > 500) {
    errors.notes = "Notes must be 500 characters or fewer.";
  }

  return {
    errors,
    values: {
      patientName,
      date,
      time,
      type,
      clinician,
      status,
      urgent: body.urgent === true || body.urgent === 1 || body.urgent === "1" ? 1 : 0,
      telehealthLink: null,
      followupRef: null,
      notes
    }
  };
};

// the shared query that joins each appointment with its patient name
const appointmentQuery = `
  SELECT a.*, p.name AS patient_name
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
`;

// returns one appointment by id or null when missing
const getAppointment = (id) => {
  const row = db.prepare(`${appointmentQuery} WHERE a.id = ?`).get(id);
  return row ? { ...row, urgent: Boolean(row.urgent) } : null;
};

// returns every appointment ordered by date then time
const listAppointments = () => db
  .prepare(`${appointmentQuery} ORDER BY a.date, a.time, a.id`)
  .all()
  .map((row) => ({ ...row, urgent: Boolean(row.urgent) }));

// the statement that inserts a new appointment row
const insertAppointment = db.prepare(`
  INSERT INTO appointments (patient_id, date, time, type, clinician, status, urgent, telehealth_link, followup_ref, notes)
  VALUES (@patientId, @date, @time, @type, @clinician, @status, @urgent, @telehealthLink, @followupRef, @notes)
`);

// the statement that updates an existing appointment row
const updateAppointment = db.prepare(`
  UPDATE appointments
  SET patient_id = @patientId,
      date = @date,
      time = @time,
      type = @type,
      clinician = @clinician,
      status = @status,
      urgent = @urgent,
      telehealth_link = @telehealthLink,
      followup_ref = @followupRef,
      notes = @notes
  WHERE id = @id
`);

// the statement that inserts a patient created from a new appointment
const insertNewPatient = db.prepare(`
  INSERT INTO patients (name, dob, phone, email, notes)
  VALUES (?, '', '', '', '')
`);

// finds or creates the patient for an appointment
const patientIdFor = (name) => {
  const found = findPatient.get(name);
  if (found) { return found.id; }
  return insertNewPatient.run(name).lastInsertRowid;
};

// inserts the patient and appointment in one transaction
const insertWithPatient = db.transaction((values) => {
  const patientId = patientIdFor(values.patientName);
  return insertAppointment.run({ ...values, patientId }).lastInsertRowid;
});

// updates the appointment and creates its patient in one transaction
const updateWithPatient = db.transaction((values, id) => {
  const patientId = patientIdFor(values.patientName);
  updateAppointment.run({ ...values, patientId, id });
});

// json body parsing with a small size limit
app.use(express.json({ limit: "100kb" }));

// returns every patient ordered by name
app.get("/api/patients", (req, res) => {
  res.json(db.prepare("SELECT * FROM patients ORDER BY name").all());
});

// returns every appointment after a short delay so loading states are visible
app.get("/api/appointments", async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  res.json(listAppointments());
});

// creates an appointment after validating the sent values
app.post("/api/appointments", (req, res) => {
  const { errors, values } = validateAppointment(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }
  const id = insertWithPatient(values);
  res.status(201).json(getAppointment(id));
});

// replaces an appointment after checking it exists and the values are valid
app.put("/api/appointments/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ error: "Appointment not found." });
  }
  const existing = db.prepare("SELECT id FROM appointments WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Appointment not found." });
  }
  const { errors, values } = validateAppointment(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }
  updateWithPatient(values, id);
  res.json(getAppointment(id));
});

// deletes an appointment when the id matches a row
app.delete("/api/appointments/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ error: "Appointment not found." });
  }
  const result = db.prepare("DELETE FROM appointments WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Appointment not found." });
  }
  res.status(204).end();
});

// answers unknown api paths with a not found status
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

// serves the static site from the public folder
app.use(express.static(path.join(root, "public")));

// answers broken request bodies and unexpected errors
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ errors: { body: "Send valid JSON." } });
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong." });
});

// starts the server on the chosen port
app.listen(port, () => {
  console.log(`LumenDesk running at http://localhost:${port}`);
});
