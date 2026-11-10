const statusRegion = document.querySelector("#status");
const toastLabels = { success: "Success", error: "Error", warning: "Warning", info: "Info" };
const toastIcons = { success: "✓", error: "!", warning: "⚠", info: "i" };
let announceTimer;
let toastTimer;

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

export const focusHeading = () => {
  const heading = document.querySelector("#main h1");
  if (!heading) {
    return;
  }
  heading.tabIndex = -1;
  heading.focus();
};

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
