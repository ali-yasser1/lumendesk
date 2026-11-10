import { announce, focusHeading } from "./ui.js";
import { renderSignIn } from "./views/signin.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderAppointmentForm } from "./views/appointment-form.js";
import { renderRecords } from "./views/records.js";

const defaultRoute = "#/dashboard";
const signInRoute = "#/signin";
const editPattern = /^#\/appointments\/edit\/([1-9]\d*)$/;

const routes = {
  "#/signin": { title: "Sign in", render: renderSignIn },
  "#/dashboard": { title: "Dashboard", render: renderDashboard },
  "#/appointments/new": {
    title: "New appointment",
    render: (main) => renderAppointmentForm(main)
  },
  "#/records": { title: "Records", render: renderRecords }
};

const getUser = () => sessionStorage.getItem("lumen-user");

const resolveRoute = (hash) => {
  const edit = hash.match(editPattern);
  if (edit) {
    return {
      title: "Edit appointment",
      current: "#/records",
      render: (main) => renderAppointmentForm(main, Number(edit[1]))
    };
  }
  return routes[hash] || null;
};

const setHash = (hash) => {
  if (location.hash !== hash) {
    history.replaceState(null, "", hash);
  }
};

const updateCurrentLink = (target) => {
  document.querySelectorAll(".site-nav a").forEach((link) => {
    if (link.getAttribute("href") === target) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const render = () => {
  let hash = location.hash;
  let route = resolveRoute(hash);
  if (!route) {
    hash = defaultRoute;
    setHash(hash);
    route = resolveRoute(hash);
  }
  if (!getUser() && hash !== signInRoute) {
    hash = signInRoute;
    setHash(hash);
    route = resolveRoute(hash);
  }
  if (getUser() && hash === signInRoute) {
    hash = defaultRoute;
    setHash(hash);
    route = resolveRoute(hash);
  }
  const main = document.querySelector("#main");
  main.replaceChildren();
  route.render(main, getUser());
  document.title = `${route.title} - LumenDesk`;
  updateCurrentLink(route.current || hash);
  focusHeading();
  announce(`${route.title} loaded`);
};

export const startRouter = () => {
  window.addEventListener("hashchange", render);
  render();
};
