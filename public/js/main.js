// shell wiring for the nav, the sign out button and the footer year
import { announce } from "./ui.js";
import { startRouter } from "./router.js";

const main = document.querySelector("#main");
const nav = document.querySelector("#primary-nav");
const navToggle = document.querySelector("#nav-toggle");
const signOut = document.querySelector("#signout");
const skipLink = document.querySelector(".skip-link");
const year = document.querySelector("#year");

// closes the nav menu and optionally returns focus to its toggle
const closeNav = (returnFocus = false) => {
  nav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  if (returnFocus) {
    navToggle.focus();
  }
};

// shows or hides the nav and the sign out button based on the session
const syncShell = () => {
  const signedIn = Boolean(sessionStorage.getItem("lumen-user"));
  nav.hidden = !signedIn;
  navToggle.hidden = !signedIn;
  signOut.hidden = !signedIn;
  if (!signedIn) {
    closeNav();
  }
};

// opens and closes the nav menu from the toggle button
navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

// closes the nav menu after any link inside it is used
nav.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) {
    closeNav();
  }
});

// closes the nav menu with the escape key and returns focus to the toggle
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("is-open")) {
    closeNav(true);
  }
});

// moves keyboard focus past the header into the main region
skipLink.addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView({ block: "start" });
});

// clears the session and returns the user to the sign in view
signOut.addEventListener("click", () => {
  sessionStorage.removeItem("lumen-user");
  syncShell();
  closeNav();
  location.hash = "#/signin";
  window.setTimeout(() => announce("Signed out"), 300);
});

document.addEventListener("lumen:authchange", syncShell);

year.textContent = new Date().getFullYear();
syncShell();
startRouter();
