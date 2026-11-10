import { announce, focusHeading } from "./ui.js";
import { renderSignIn } from "./views/signin.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderPlaceholder } from "./views/placeholder.js";

const defaultRoute = "#/dashboard";
const signInRoute = "#/signin";

const routes = {
  "#/signin": { title: "Sign in", render: renderSignIn },
  "#/dashboard": { title: "Dashboard", render: renderDashboard },
  "#/appointments/new": {
    title: "New appointment",
    render: (main) => renderPlaceholder(main, "New appointment", "The appointment form is coming soon.")
  },
  "#/records": {
    title: "Records",
    render: (main) => renderPlaceholder(main, "Records", "Patient records will appear here.")
  }
};

const getUser = () => sessionStorage.getItem("lumen-user");

const setHash = (hash) => {
  if (location.hash !== hash) {
    history.replaceState(null, "", hash);
  }
};

const updateCurrentLink = (hash) => {
  document.querySelectorAll(".site-nav a").forEach((link) => {
    if (link.getAttribute("href") === hash) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const render = () => {
  let hash = location.hash;
  if (!routes[hash]) {
    hash = defaultRoute;
    setHash(hash);
  }
  if (!getUser() && hash !== signInRoute) {
    hash = signInRoute;
    setHash(hash);
  }
  if (getUser() && hash === signInRoute) {
    hash = defaultRoute;
    setHash(hash);
  }
  const route = routes[hash];
  const main = document.querySelector("#main");
  main.replaceChildren();
  route.render(main, getUser());
  document.title = `${route.title} - LumenDesk`;
  updateCurrentLink(hash);
  focusHeading();
  announce(`${route.title} loaded`);
};

export const startRouter = () => {
  window.addEventListener("hashchange", render);
  render();
};
