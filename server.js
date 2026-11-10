import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./db.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

const types = new Set(["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"]);
const statuses = new Set(["Scheduled", "Completed", "Cancelled", "No-show"]);

const text = (value) => (typeof value === "string" ? value.trim() : "");

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const isTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const patientExists = (id) => Boolean(db.prepare("SELECT 1 FROM patients WHERE id = ?").get(id));

const validateAppointment = (input) => {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};
  const patientId = Number(body.patient_id);

  if (!Number.isInteger(patientId) || patientId < 1) {
    errors.patient_id = "Choose a patient.";
  } else if (!patientExists(patientId)) {
    errors.patient_id = "Choose an existing patient.";
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
      patientId,
      date,
      time,
      type,
      clinician,
      status,
      urgent: body.urgent === true || body.urgent === 1 || body.urgent === "1" ? 1 : 0,
      telehealthLink: text(body.telehealth_link) || null,
      followupRef: text(body.followup_ref) || null,
      notes
    }
  };
};

const appointmentQuery = `
  SELECT a.*, p.name AS patient_name
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
`;

const getAppointment = (id) => {
  const row = db.prepare(`${appointmentQuery} WHERE a.id = ?`).get(id);
  return row ? { ...row, urgent: Boolean(row.urgent) } : null;
};

const listAppointments = () => db
  .prepare(`${appointmentQuery} ORDER BY a.date, a.time, a.id`)
  .all()
  .map((row) => ({ ...row, urgent: Boolean(row.urgent) }));

const insertAppointment = db.prepare(`
  INSERT INTO appointments (patient_id, date, time, type, clinician, status, urgent, telehealth_link, followup_ref, notes)
  VALUES (@patientId, @date, @time, @type, @clinician, @status, @urgent, @telehealthLink, @followupRef, @notes)
`);

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

app.use(express.json({ limit: "100kb" }));

app.get("/api/patients", (req, res) => {
  res.json(db.prepare("SELECT * FROM patients ORDER BY name").all());
});

app.get("/api/appointments", async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  res.json(listAppointments());
});

app.post("/api/appointments", (req, res) => {
  const { errors, values } = validateAppointment(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }
  const result = insertAppointment.run(values);
  res.status(201).json(getAppointment(result.lastInsertRowid));
});

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
  updateAppointment.run({ ...values, id });
  res.json(getAppointment(id));
});

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

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use(express.static(path.join(root, "public")));

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ errors: { body: "Send valid JSON." } });
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(port, () => {
  console.log(`LumenDesk running at http://localhost:${port}`);
});
