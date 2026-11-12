// shared helpers for talking to the server api
const request = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (response.status === 204) { return null; }
  let data = null;
  try { data = await response.json(); } catch (error) { data = null; }
  if (!response.ok) {
    const failure = new Error(data?.error || `Request failed: ${response.status}`);
    if (response.status === 400 && data?.errors) { failure.errors = data.errors; }
    throw failure;
  }
  return data;
};

// sends data with the given method as json
const send = (method, url, data) => request(url, {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
});

// picks the patient and visit fields the server accepts
const appointmentBody = (data) => ({
  patient_name: data.patient_name,
  patient_phone: data.patient_phone,
  date: data.date,
  time: data.time,
  type: data.type,
  clinician: data.clinician,
  status: data.status,
  urgent: data.urgent,
  notes: data.notes
});

// returns every appointment in the schedule
export const getAppointments = () => request("/api/appointments");

// returns every patient that can be picked in the form
export const getPatients = () => request("/api/patients");

// creates a new appointment with the typed patient name and visit fields
export const createAppointment = (data) => send("POST", "/api/appointments", appointmentBody(data));

// replaces an existing appointment with the typed patient name and new values
export const updateAppointment = (id, data) => send("PUT", `/api/appointments/${id}`, appointmentBody(data));

// removes an appointment from the schedule
export const deleteAppointment = (id) => send("DELETE", `/api/appointments/${id}`);
