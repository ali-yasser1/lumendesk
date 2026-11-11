// shared ui helpers for live announcements, dom building and page messages
const statusRegion = document.querySelector("#status");
const pageMessage = document.querySelector("#page-message");
const messageIcons = { success: "✓", error: "!", info: "i" };
let announceTimer;
let messageTimer;

// sends a message to the polite live region so screen readers hear it
export const announce = (message) => {
  if (!statusRegion) { return; }
  window.clearTimeout(announceTimer);
  statusRegion.textContent = "";
  announceTimer = window.setTimeout(() => { statusRegion.textContent = message; }, 50);
};

// creates a dom node from a tag, attributes and children
export const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) { continue; }
    if (key === "class") { node.className = value; }
    else if (key === "text") { node.textContent = value; }
    else if (key.startsWith("on") && typeof value === "function") { node.addEventListener(key.slice(2).toLowerCase(), value); }
    else if (value === true) { node.setAttribute(key, ""); }
    else { node.setAttribute(key, value); }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) { continue; }
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};

// builds the plain loading message shown inside a busy region
export const loadingMessage = (text) => el("p", { class: "loading" }, [
  el("span", { class: "spinner", "aria-hidden": "true" }), text
]);

// builds a state panel with a heading, a line of text and one action
export const statePanel = (heading, text, action, extraClass = "") => el("div", {
  class: extraClass ? `state-panel ${extraClass}` : "state-panel"
}, [el("h2", { text: heading }), el("p", { text }), action]);

// moves focus to the view heading so keyboard users land after navigation
export const focusHeading = () => {
  const heading = document.querySelector("#main h1");
  if (!heading) { return; }
  heading.tabIndex = -1; heading.focus();
};

// shows a short status message above the page content and clears it after 5 seconds
export const showMessage = (message, type = "info") => {
  const kind = messageIcons[type] ? type : "info";
  window.clearTimeout(messageTimer);
  pageMessage.className = `page-message page-message-${kind}`;
  pageMessage.replaceChildren(el("span", { class: "page-message-icon", "aria-hidden": "true", text: messageIcons[kind] }), message);
  messageTimer = window.setTimeout(() => { pageMessage.replaceChildren(); pageMessage.className = "page-message"; }, 5000);
};
