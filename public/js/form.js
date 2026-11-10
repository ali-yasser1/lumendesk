import { el } from "./ui.js";

const describedBy = (input) => (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);

const groupControls = (input) => {
  if (input.type !== "radio" || !input.name) {
    return [input];
  }
  return Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(input.name)}"]`));
};

const errorTarget = (input) => input.closest(".field, fieldset") || input;

export const setFieldError = (input, message) => {
  const id = `${input.id}-error`;
  const existing = document.getElementById(id);
  const controls = groupControls(input);
  controls.forEach((control) => {
    const ids = describedBy(control).filter((value) => value !== id);
    if (message) {
      ids.push(id);
      control.setAttribute("aria-invalid", "true");
    } else {
      control.removeAttribute("aria-invalid");
    }
    if (ids.length > 0) {
      control.setAttribute("aria-describedby", ids.join(" "));
    } else {
      control.removeAttribute("aria-describedby");
    }
  });
  if (!message) {
    existing?.remove();
    return;
  }
  let error = existing;
  if (!error) {
    error = el("p", { class: "field-error", id }, [
      el("span", { class: "field-error-icon", "aria-hidden": "true", text: "!" }),
      el("span", { class: "field-error-text" })
    ]);
    errorTarget(input).append(error);
  }
  error.querySelector(".field-error-text").textContent = message;
  error.hidden = false;
};

export const buildSummary = (fields, messages) => {
  const unique = [...new Set(fields)];
  const count = unique.length;
  const heading = `Please fix ${count} ${count === 1 ? "problem" : "problems"}`;
  const list = el("ul", {}, unique.map((field) => el("li", {}, el("a", {
    href: `#${field.id}`,
    text: messages[field.id] || messages[field.name] || "Fix this field",
    onClick: (event) => {
      event.preventDefault();
      field.focus();
    }
  }))));
  return [el("h2", { text: heading }), list];
};
