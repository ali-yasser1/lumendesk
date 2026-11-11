// shell wiring for the nav, the sign out button and the footer year
import { announce } from "./ui.js";
import { startRouter } from "./router.js";

const main = document.querySelector("#main");
const nav = document.querySelector("#primary-nav");
const signOut = document.querySelector("#signout");
const skipLink = document.querySelector(".skip-link");
const year = document.querySelector("#year");

// shows or hides the nav and the sign out button based on the session
const syncShell = () => {
  const signedIn = Boolean(sessionStorage.getItem("lumen-user"));
  nav.hidden = !signedIn; signOut.hidden = !signedIn;
};

// moves keyboard focus past the header into the main region
skipLink.addEventListener("click", (event) => {
  event.preventDefault(); main.focus(); main.scrollIntoView({ block: "start" });
});

// clears the session and returns the user to the sign in view
signOut.addEventListener("click", () => {
  sessionStorage.removeItem("lumen-user"); syncShell(); location.hash = "#/signin";
  window.setTimeout(() => announce("Signed out"), 300);
});

document.addEventListener("lumen:authchange", syncShell);

year.textContent = new Date().getFullYear();
syncShell();
startRouter();
