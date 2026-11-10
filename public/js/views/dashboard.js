import { announce, el, showToast } from "../ui.js";
import { getAppointments, getPatients } from "../api.js";

const formatDate = (date) => new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short"
}).format(new Date(`${date}T00:00:00`));

const formatTime = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(2000, 0, 1, hour, minute));
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

const isUpcoming = (appointment) => new Date(`${appointment.date}T${appointment.time}:00`) >= new Date();

const byDateTime = (a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);

const statData = (appointments) => [
  { label: "Total appointments", value: appointments.length, icon: "▦", accent: "cyan" },
  { label: "Scheduled", value: appointments.filter((item) => item.status === "Scheduled").length, icon: "◷", accent: "violet" },
  { label: "Urgent", value: appointments.filter((item) => item.urgent).length, icon: "!", accent: "pink" },
  { label: "Telehealth", value: appointments.filter((item) => item.type === "Telehealth").length, icon: "▣", accent: "lime" }
];

const renderStats = (appointments) => el(
  "ul",
  { class: "stat-grid", "aria-label": "Appointment overview" },
  statData(appointments).map((stat) => el("li", { class: `stat-card glass accent-${stat.accent}` }, [
    el("span", { class: "stat-icon", "aria-hidden": "true", text: stat.icon }),
    el("strong", { class: "stat-number", text: String(stat.value) }),
    el("span", { class: "stat-label", text: stat.label })
  ]))
);

const renderAppointment = (appointment) => el("li", {}, el("article", { class: "appointment-item glass" }, [
  el("div", { class: "appointment-head" }, [
    el("h3", { text: appointment.patient_name }),
    el("div", { class: "badge-row" }, [
      appointment.urgent ? el("span", { class: "badge badge-urgent" }, [
        el("span", { "aria-hidden": "true", text: "!" }),
        "Urgent"
      ]) : null,
      appointment.type === "Telehealth" ? el("span", { class: "badge badge-telehealth" }, [
        el("span", { "aria-hidden": "true", text: "▣" }),
        "Telehealth"
      ]) : null
    ])
  ]),
  el("dl", { class: "appointment-meta" }, [
    el("div", {}, [el("dt", { text: "Date" }), el("dd", { text: formatDate(appointment.date) })]),
    el("div", {}, [el("dt", { text: "Time" }), el("dd", { text: formatTime(appointment.time) })]),
    el("div", {}, [el("dt", { text: "Type" }), el("dd", { text: appointment.type })])
  ])
]));

const renderEmpty = () => el("div", { class: "state-panel" }, [
  el("h3", { text: "No upcoming appointments" }),
  el("p", { text: "The schedule is clear. Create a new appointment to get started." }),
  el("a", { class: "button button-primary", href: "#/appointments/new", text: "Create an appointment" })
]);

const renderQuickActions = () => el("ul", { class: "quick-actions" }, [
  el("li", {}, el("a", { class: "quick-action glass accent-cyan", href: "#/appointments/new" }, [
    el("span", { class: "quick-action-icon", "aria-hidden": "true", text: "+" }),
    el("span", { class: "quick-action-copy" }, [
      el("strong", { text: "New appointment" }),
      el("span", { text: "Book a visit for a patient" })
    ])
  ])),
  el("li", {}, el("a", { class: "quick-action glass accent-violet", href: "#/records" }, [
    el("span", { class: "quick-action-icon", "aria-hidden": "true", text: "▤" }),
    el("span", { class: "quick-action-copy" }, [
      el("strong", { text: "View records" }),
      el("span", { text: "Open the patient record area" })
    ])
  ]))
]);

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

const renderSkeleton = (content) => {
  content.replaceChildren(
    el("p", { class: "visually-hidden", text: "Loading dashboard" }),
    el("div", { class: "skeleton-grid", "aria-hidden": "true" }, [1, 2, 3, 4].map(() => el("div", { class: "skeleton-card" })))
  );
};

const renderError = (content, retry) => {
  content.replaceChildren(
    el("div", { class: "state-panel error-state" }, [
      el("h2", { text: "We could not load the dashboard" }),
      el("p", { text: "Check the connection and try again." }),
      el("button", { class: "button button-primary", type: "button", onClick: retry, text: "Try again" })
    ])
  );
};

export const renderDashboard = (main, user) => {
  const name = user || "there";
  const content = el("div", {
    class: "dashboard-content",
    id: "dashboard-content",
    "aria-busy": "true"
  });

  const load = async () => {
    content.setAttribute("aria-busy", "true");
    renderSkeleton(content);
    window.setTimeout(() => {
      if (content.isConnected && content.getAttribute("aria-busy") === "true") {
        announce("Loading dashboard");
      }
    }, 120);
    try {
      const [appointments] = await Promise.all([getAppointments(), getPatients()]);
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
