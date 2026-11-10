const request = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (response.status === 204) {
    return null;
  }
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  if (!response.ok) {
    const failure = new Error(data?.error || `Request failed: ${response.status}`);
    if (response.status === 400 && data?.errors) {
      failure.errors = data.errors;
    }
    throw failure;
  }
  return data;
};

const send = (method, url, data) => request(url, {
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});

export const getAppointments = () => request("/api/appointments");

export const getPatients = () => request("/api/patients");

export const createAppointment = (data) => send("POST", "/api/appointments", data);

export const updateAppointment = (id, data) => send("PUT", `/api/appointments/${id}`, data);

export const deleteAppointment = (id) => send("DELETE", `/api/appointments/${id}`);
