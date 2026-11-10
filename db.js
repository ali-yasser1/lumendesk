import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "lumen.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dob TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    type TEXT NOT NULL,
    clinician TEXT NOT NULL,
    status TEXT NOT NULL,
    urgent INTEGER NOT NULL DEFAULT 0,
    telehealth_link TEXT,
    followup_ref TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );
`);

const toDateText = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const patientCount = db.prepare("SELECT COUNT(*) AS count FROM patients").get().count;
const appointmentCount = db.prepare("SELECT COUNT(*) AS count FROM appointments").get().count;

if (patientCount === 0 && appointmentCount === 0) {
  const patients = [
    {
      name: "Amara Okafor",
      dob: "1987-03-14",
      phone: "555-0101",
      email: "amara.okafor@example.com",
      notes: "Prefers morning appointments. Penicillin allergy."
    },
    {
      name: "Daniel Whitfield",
      dob: "1972-11-02",
      phone: "555-0102",
      email: "daniel.whitfield@example.com",
      notes: "Managing type 2 diabetes. Reviews glucose log at each visit."
    },
    {
      name: "Priya Raman",
      dob: "1995-06-21",
      phone: "555-0103",
      email: "priya.raman@example.com",
      notes: "Requests a quiet room. No known allergies."
    },
    {
      name: "Mateo Alvarez",
      dob: "1964-01-09",
      phone: "555-0104",
      email: "mateo.alvarez@example.com",
      notes: "Uses a walking stick. Follow-up after knee replacement."
    },
    {
      name: "Sofia Lindqvist",
      dob: "2001-09-30",
      phone: "555-0105",
      email: "sofia.lindqvist@example.com",
      notes: "Asthma action plan on file. Avoids late appointments."
    },
    {
      name: "Noah Kim",
      dob: "2010-04-17",
      phone: "555-0106",
      email: "noah.kim@example.com",
      notes: "Parent or guardian attends appointments. Vaccination schedule due."
    },
    {
      name: "Fatima Zahra",
      dob: "1979-12-05",
      phone: "555-0107",
      email: "fatima.zahra@example.com",
      notes: "Interpreter required for Arabic. Prefers telehealth when possible."
    },
    {
      name: "Liam O'Connor",
      dob: "1989-08-12",
      phone: "555-0108",
      email: "liam.oconnor@example.com",
      notes: "Recovering from shoulder injury. Works night shifts."
    },
    {
      name: "Mei Chen",
      dob: "1958-02-26",
      phone: "555-0109",
      email: "mei.chen@example.com",
      notes: "Hearing aid user. Speaks clearly and faces patient when talking."
    },
    {
      name: "Elena Petrova",
      dob: "1993-07-08",
      phone: "555-0110",
      email: "elena.petrova@example.com",
      notes: "Migraine history. Keep lights dim during examinations."
    },
    {
      name: "Samuel Adeyemi",
      dob: "1968-10-19",
      phone: "555-0111",
      email: "samuel.adeyemi@example.com",
      notes: "Hypertension review. Brings home blood pressure readings."
    },
    {
      name: "Hannah Müller",
      dob: "2004-05-03",
      phone: "555-0112",
      email: "hannah.muller@example.com",
      notes: "University student. Prefers afternoon appointments."
    }
  ];

  const types = ["Check-up", "Follow-up", "Telehealth", "Vaccination", "Lab results"];
  const statuses = ["Scheduled", "Completed", "Cancelled", "No-show"];
  const clinicians = ["Dr. Lena Ortiz", "Dr. Marcus Bell", "Dr. Aisha Rahman", "Dr. Theo Novak", "Dr. Grace Liu"];
  const times = ["08:30", "09:00", "09:30", "10:15", "11:00", "11:45", "13:15", "14:00", "14:45", "15:30", "16:15", "17:00"];
  const appointmentNotes = [
    "Routine review.",
    "Bring current medication list.",
    "Follow-up on recent lab work.",
    "Patient requested a quiet room.",
    "Interpreter booked.",
    "Review vaccination history."
  ];

  const insertPatient = db.prepare("INSERT INTO patients (name, dob, phone, email, notes) VALUES (?, ?, ?, ?, ?)");
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (patient_id, date, time, type, clinician, status, urgent, telehealth_link, followup_ref, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    for (const patient of patients) {
      insertPatient.run(patient.name, patient.dob, patient.phone, patient.email, patient.notes);
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    for (let index = 0; index < 60; index += 1) {
      const patientId = (index % 12) + 1;
      const date = new Date(today);
      date.setDate(today.getDate() + (index % 45) - 22);
      const type = types[index % types.length];
      const status = statuses[index % statuses.length];
      const urgent = index % 9 === 0 ? 1 : 0;
      const telehealthLink = type === "Telehealth" ? `https://meet.example.com/lumen-${index + 1}` : null;
      const followupRef = index % 5 === 0 ? `FU-${2400 + index}` : null;

      insertAppointment.run(
        patientId,
        toDateText(date),
        times[index % times.length],
        type,
        clinicians[index % clinicians.length],
        status,
        urgent,
        telehealthLink,
        followupRef,
        appointmentNotes[index % appointmentNotes.length]
      );
    }
  });

  seed();
  console.log("Seeded 12 patients and 60 appointments.");
}

export default db;
