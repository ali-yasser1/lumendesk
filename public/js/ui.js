// shared ui helpers for live announcements, dom building and toasts
const statusRegion = document.querySelector("#status");
const toastLabels = { success: "Success", error: "Error", info: "Info" };
const toastIcons = { success: "✓", error: "!", info: "i" };
let announceTimer;
let toastTimer;

// sends a message to the polite live region so screen readers hear it
export const announce = (message) => {
  if (!statusRegion) {
    return;
  }
  window.clearTimeout(announceTimer);
  statusRegion.textContent = "";
  announceTimer = window.setTimeout(() => {
    statusRegion.textContent = message;
  }, 50);
};

// creates a dom node from a tag, attributes and children
export const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) {
      continue;
    }
    if (key === "class") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, value);
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};

// builds the plain loading message shown inside a busy region
export const loadingMessage = (text) => el("p", { class: "loading" }, [
  el("span", { class: "spinner", "aria-hidden": "true" }),
  text
]);

// builds a state panel with a heading, a line of text and one action
export const statePanel = (heading, text, action, extraClass = "") => el("div", {
  class: extraClass ? `state-panel ${extraClass}` : "state-panel"
}, [
  el("h2", { text: heading }),
  el("p", { text }),
  action
]);

// moves focus to the view heading so keyboard users land after navigation
export const focusHeading = () => {
  const heading = document.querySelector("#main h1");
  if (!heading) {
    return;
  }
  heading.tabIndex = -1;
  heading.focus();
};

// shows a short toast and announces the same text for screen readers
export const showToast = (message, type = "info") => {
  const kind = toastLabels[type] ? type : "info";
  let region = document.querySelector("#toast-region");
  if (!region) {
    region = el("div", { id: "toast-region", class: "toast-region", "aria-hidden": "true" });
    document.body.append(region);
  }
  window.clearTimeout(toastTimer);
  region.replaceChildren(
    el("div", { class: `toast toast-${kind}` }, [
      el("span", { class: "toast-icon", "aria-hidden": "true", text: toastIcons[kind] }),
      el("span", { class: "toast-message", text: message })
    ])
  );
  announce(`${toastLabels[kind]}: ${message}`);
  toastTimer = window.setTimeout(() => {
    region.replaceChildren();
  }, 6000);
};
