import { announce } from "./ui.js";
import { startRouter } from "./router.js";

const main = document.querySelector("#main");
const nav = document.querySelector("#primary-nav");
const navToggle = document.querySelector("#nav-toggle");
const signOut = document.querySelector("#signout");
const skipLink = document.querySelector(".skip-link");
const year = document.querySelector("#year");

const closeNav = (returnFocus = false) => {
  nav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  if (returnFocus) {
    navToggle.focus();
  }
};

const syncShell = () => {
  const signedIn = Boolean(sessionStorage.getItem("lumen-user"));
  nav.hidden = !signedIn;
  navToggle.hidden = !signedIn;
  signOut.hidden = !signedIn;
  if (!signedIn) {
    closeNav();
  }
};

navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

nav.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) {
    closeNav();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("is-open")) {
    closeNav(true);
  }
});

skipLink.addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView({ block: "start" });
});

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
