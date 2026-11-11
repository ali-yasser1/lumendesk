// builds the dashboard view with its overview stats and next appointments
import { announce, el, loadingMessage, showMessage, statePanel } from "../ui.js";
import { getAppointments } from "../api.js";
import { formatDate, formatTime } from "../format.js";

const dayFormat = { weekday: "short", day: "numeric", month: "short" };

// picks a greeting from the current hour
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) { return "Good morning"; }
  return hour < 18 ? "Good afternoon" : "Good evening";
};

// checks if an appointment is still in the future
const isUpcoming = (appointment) =>
  new Date(`${appointment.date}T${appointment.time}:00`) >= new Date();

// sorts appointments by date then time
const byDateTime = (a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);

// renders the overview as a plain list of four cards, numbers and labels only
const renderStats = (appointments) => {
  const stats = [
    ["Total appointments", appointments.length],
    ["Scheduled", appointments.filter((item) => item.status === "Scheduled").length],
    ["Urgent", appointments.filter((item) => item.urgent).length],
    ["Telehealth", appointments.filter((item) => item.type === "Telehealth").length]
  ];
  return el("ul", { class: "stat-grid", "aria-label": "Appointment overview" },
    stats.map(([label, value]) => el("li", { class: "stat-card" }, [
      el("strong", { class: "stat-number", text: String(value) }), el("span", { class: "stat-label", text: label })])));
};

// renders one upcoming appointment card with its badges
const renderAppointment = (appointment) => el("li", {}, el("article", { class: "appointment-item" }, [
  el("div", { class: "appointment-head" }, [
    el("h3", { text: appointment.patient_name }),
    el("div", { class: "badge-row" }, [
      appointment.urgent ? el("span", { class: "badge badge-urgent" }, [el("span", { "aria-hidden": "true", text: "!" }), "Urgent"]) : null,
      appointment.type === "Telehealth" ? el("span", { class: "badge badge-telehealth" }, [el("span", { "aria-hidden": "true", text: "▣" }), "Telehealth"]) : null
    ])
  ]),
  el("dl", { class: "appointment-meta" }, [
    el("div", {}, [el("dt", { text: "Date" }), el("dd", { text: formatDate(appointment.date, dayFormat) })]),
    el("div", {}, [el("dt", { text: "Time" }), el("dd", { text: formatTime(appointment.time) })]),
    el("div", {}, [el("dt", { text: "Type" }), el("dd", { text: appointment.type })])
  ])
]));

// shown when the schedule has no upcoming appointments
const renderEmpty = () => el("div", { class: "state-panel" }, [
  el("h3", { text: "No upcoming appointments" }),
  el("p", { text: "The schedule is clear. Create a new appointment to get started." }),
  el("a", { class: "button button-primary", href: "#/appointments/new", text: "Create an appointment" })
]);

// shown when the appointments request fails
const renderError = (content, retry) => content.replaceChildren(statePanel("We could not load the dashboard",
  "Check the connection and try again.",
  el("button", { class: "button button-primary", type: "button", onClick: retry, text: "Try again" }),
  "error-state"));

// fills the page with the overview and the next appointments
const renderContent = (content, appointments) => {
  const upcoming = appointments
    .filter((appointment) => appointment.status === "Scheduled" && isUpcoming(appointment)).sort(byDateTime).slice(0, 6);
  content.replaceChildren(
    el("section", { class: "dashboard-section", "aria-labelledby": "overview-title" }, [
      el("h2", { id: "overview-title", text: "Overview" }),
      renderStats(appointments)
    ]),
    el("section", { class: "dashboard-section", "aria-labelledby": "next-title" }, [
      el("h2", { id: "next-title", text: "Next appointments" }),
      upcoming.length > 0 ? el("ul", { class: "appointment-list" }, upcoming.map(renderAppointment)) : renderEmpty()
    ])
  );
};

// loads the appointments then renders the overview and the next list
const loadDashboard = async (content) => {
  content.setAttribute("aria-busy", "true");
  content.replaceChildren(loadingMessage("Loading..."));
  window.setTimeout(() => { if (content.isConnected && content.getAttribute("aria-busy") === "true") { announce("Loading dashboard"); } }, 120);
  try {
    const appointments = await getAppointments();
    if (!content.isConnected) { return; }
    content.setAttribute("aria-busy", "false"); renderContent(content, appointments);
    announce(`Dashboard ready, ${appointments.length} appointments`);
  } catch (error) {
    if (!content.isConnected) { return; }
    content.setAttribute("aria-busy", "false"); renderError(content, () => loadDashboard(content));
    showMessage("The dashboard could not load.", "error");
  }
};

// builds the dashboard view shell and starts loading the appointments
export const renderDashboard = (main, user) => {
  const content = el("div", { class: "dashboard-content", id: "dashboard-content", "aria-busy": "true" });
  main.append(
    el("div", { class: "view dashboard-view" }, [
      el("header", { class: "view-header" }, [
        el("h1", { id: "dashboard-title", text: `Welcome back, ${user || "there"}` }),
        el("p", { class: "view-subtitle", text: `${getGreeting()}. Here is the clinic at a glance.` })
      ]),
      content
    ])
  );
  loadDashboard(content);
};
