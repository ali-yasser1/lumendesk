// maps the location hash to a view and renders it inside main
import { announce, focusHeading } from "./ui.js";
import { renderSignIn } from "./views/signin.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderAppointmentForm } from "./views/appointment-form.js";
import { renderRecords } from "./views/records.js";

const defaultRoute = "#/dashboard";
const signInRoute = "#/signin";
const editPattern = /^#\/appointments\/edit\/([1-9]\d*)$/;

// the views the hash routes can render
const routes = {
  "#/signin": { title: "Sign in", render: renderSignIn },
  "#/dashboard": { title: "Dashboard", render: renderDashboard },
  "#/appointments/new": {
    title: "New appointment",
    render: (main) => renderAppointmentForm(main)
  },
  "#/records": { title: "Records", render: renderRecords }
};

// returns the signed in username or null
const getUser = () => sessionStorage.getItem("lumen-user");

// matches a hash to a route and builds the edit route from its id
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

// replaces the hash without leaving a new history entry
const setHash = (hash) => {
  if (location.hash !== hash) {
    history.replaceState(null, "", hash);
  }
};

// marks the nav link of the current view with aria current
const updateCurrentLink = (target) => {
  document.querySelectorAll(".site-nav a").forEach((link) => {
    if (link.getAttribute("href") === target) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

// renders the matching view and guards the routes behind the sign in
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

// starts listening for hash changes and renders the first view
export const startRouter = () => {
  window.addEventListener("hashchange", render);
  render();
};
