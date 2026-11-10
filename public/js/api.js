const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

export const getAppointments = () => getJson("/api/appointments");

export const getPatients = () => getJson("/api/patients");
