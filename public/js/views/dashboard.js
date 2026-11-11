// builds the dashboard view with stats, next appointments and quick actions
import { announce, el, loadingMessage, showToast, statePanel } from "../ui.js";
import { getAppointments } from "../api.js";
import { formatDate, formatTime } from "../format.js";

const dayFormat = { weekday: "short", day: "numeric", month: "short" };

// picks a greeting from the current hour
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  return hour < 18 ? "Good afternoon" : "Good evening";
};

// checks if an appointment is still in the future
const isUpcoming = (appointment) =>
  new Date(`${appointment.date}T${appointment.time}:00`) >= new Date();

// sorts appointments by date then time
const byDateTime = (a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);

// renders the overview stat cards
const renderStats = (appointments) => {
  const stats = [
    { label: "Total appointments", value: appointments.length, icon: "▦", accent: "cyan" },
    { label: "Scheduled", value: appointments.filter((item) => item.status === "Scheduled").length, icon: "◷", accent: "violet" },
    { label: "Urgent", value: appointments.filter((item) => item.urgent).length, icon: "!", accent: "pink" },
    { label: "Telehealth", value: appointments.filter((item) => item.type === "Telehealth").length, icon: "▣", accent: "lime" }
  ];
  return el("ul", { class: "stat-grid", "aria-label": "Appointment overview" },
    stats.map((stat) => el("li", { class: `stat-card glass accent-${stat.accent}` }, [
      el("span", { class: "stat-icon", "aria-hidden": "true", text: stat.icon }),
      el("strong", { class: "stat-number", text: String(stat.value) }),
      el("span", { class: "stat-label", text: stat.label })
    ])));
};

// renders one upcoming appointment card with its badges
const renderAppointment = (appointment) => el("li", {}, el("article", { class: "appointment-item glass" }, [
  el("div", { class: "appointment-head" }, [
    el("h3", { text: appointment.patient_name }),
    el("div", { class: "badge-row" }, [
      appointment.urgent ? el("span", { class: "badge badge-urgent" }, [
        el("span", { "aria-hidden": "true", text: "!" }), "Urgent"
      ]) : null,
      appointment.type === "Telehealth" ? el("span", { class: "badge badge-telehealth" }, [
        el("span", { "aria-hidden": "true", text: "▣" }), "Telehealth"
      ]) : null
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

// the two large shortcut links and where they lead
const quickActions = [
  { href: "#/appointments/new", icon: "+", accent: "cyan", title: "New appointment", copy: "Book a visit for a patient" },
  { href: "#/records", icon: "▤", accent: "violet", title: "View records", copy: "Open the patient record area" }
];

// renders the large shortcut links from the quick action data
const renderQuickActions = () => el("ul", { class: "quick-actions" },
  quickActions.map((action) => el("li", {}, el("a", { class: `quick-action glass accent-${action.accent}`, href: action.href }, [
    el("span", { class: "quick-action-icon", "aria-hidden": "true", text: action.icon }),
    el("span", { class: "quick-action-copy" }, [
      el("strong", { text: action.title }),
      el("span", { text: action.copy })
    ])
  ]))));

// shown when the appointments request fails
const renderError = (content, retry) => content.replaceChildren(statePanel("We could not load the dashboard",
  "Check the connection and try again.",
  el("button", { class: "button button-primary", type: "button", onClick: retry, text: "Try again" }),
  "error-state"));

// fills the page with stats, the next appointments and quick actions
const renderContent = (content, appointments) => {
  const upcoming = appointments
    .filter((appointment) => appointment.status === "Scheduled" && isUpcoming(appointment))
    .sort(byDateTime)
    .slice(0, 6);
  content.replaceChildren(
    el("section", { class: "dashboard-section", "aria-labelledby": "overview-title" }, [
      el("h2", { id: "overview-title", text: "Overview" }),
      renderStats(appointments)
    ]),
    el("section", { class: "dashboard-section", "aria-labelledby": "next-title" }, [
      el("h2", { id: "next-title", text: "Next appointments" }),
      upcoming.length > 0 ? el("ul", { class: "appointment-list" }, upcoming.map(renderAppointment)) : renderEmpty()
    ]),
    el("section", { class: "dashboard-section", "aria-labelledby": "quick-title" }, [
      el("h2", { id: "quick-title", text: "Quick actions" }),
      renderQuickActions()
    ])
  );
};

// builds the dashboard shell then loads the appointments into it
export const renderDashboard = (main, user) => {
  const name = user || "there";
  const content = el("div", { class: "dashboard-content", id: "dashboard-content", "aria-busy": "true" });

  // loads the appointments then renders the stats and the upcoming list
  const load = async () => {
    content.setAttribute("aria-busy", "true");
    content.replaceChildren(loadingMessage("Loading..."));
    window.setTimeout(() => {
      if (content.isConnected && content.getAttribute("aria-busy") === "true") {
        announce("Loading dashboard");
      }
    }, 120);
    try {
      const appointments = await getAppointments();
      if (!content.isConnected) {
        return;
      }
      content.setAttribute("aria-busy", "false");
      renderContent(content, appointments);
      announce(`Dashboard ready, ${appointments.length} appointments`);
    } catch (error) {
      if (!content.isConnected) {
        return;
      }
      content.setAttribute("aria-busy", "false");
      renderError(content, load);
      showToast("The dashboard could not load.", "error");
    }
  };

  main.append(
    el("div", { class: "view dashboard-view" }, [
      el("header", { class: "view-header" }, [
        el("h1", { id: "dashboard-title", text: `Welcome back, ${name}` }),
        el("p", { class: "view-subtitle", text: `${getGreeting()}. Here is the clinic at a glance.` })
      ]),
      content
    ])
  );

  load();
};
