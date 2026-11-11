// renders the sign in view with its form, validation and fake sign in
import { announce, el, showMessage } from "../ui.js";
import { buildSummary, setFieldError } from "../form.js";

// the messages shown for each invalid field
const messages = {
  username: "Enter your username",
  password: "Enter your password"
};

// validates one input and shows or clears its inline error
const validateField = (input) => {
  const empty = input.value.trim() === "";
  setFieldError(input, empty ? messages[input.id] : "");
  return empty;
};

// shows the summary listing the invalid fields and moves focus to it
const showSummary = (summary, invalid) => {
  summary.replaceChildren(...buildSummary(invalid, messages));
  summary.hidden = false;
  summary.focus();
};

// swaps the password between hidden and readable text
const togglePassword = (password, button) => {
  const showing = password.type === "text";
  password.type = showing ? "password" : "text";
  button.setAttribute("aria-pressed", String(!showing));
  button.textContent = showing ? "Show password" : "Hide password";
};

// clears the inline error of an input as soon as it holds text
const clearWhenFilled = (input) => {
  input.addEventListener("input", () => { if (input.value.trim()) { setFieldError(input, ""); } });
};

// runs the fake sign in then moves the user to the dashboard
const signIn = (form, submit, username) => {
  form.setAttribute("aria-busy", "true");
  submit.disabled = true;
  submit.replaceChildren(el("span", { class: "spinner", "aria-hidden": "true" }), document.createTextNode("Signing in..."));
  announce("Signing in");
  window.setTimeout(() => {
    const name = username.value.trim(); sessionStorage.setItem("lumen-user", name);
    document.dispatchEvent(new CustomEvent("lumen:authchange"));
    showMessage(`Welcome back, ${name}`, "success");
    window.setTimeout(() => { location.hash = "#/dashboard"; }, 300);
  }, 1200);
};

// wires the validation and submit behaviour of the sign in form
const wireForm = (form, summary, username, password, showPassword, submit) => {
  showPassword.addEventListener("click", () => togglePassword(password, showPassword));
  username.addEventListener("blur", () => validateField(username));
  password.addEventListener("blur", () => validateField(password));
  clearWhenFilled(username);
  clearWhenFilled(password);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalid = [username, password].filter((input) => validateField(input));
    if (invalid.length > 0) { return showSummary(summary, invalid); }
    summary.hidden = true;
    signIn(form, submit, username);
  });
};

// builds the sign in form with its fields, toggle and submit button
const buildForm = () => {
  const form = el("form", { class: "signin-form", novalidate: true });
  const summary = el("div", { class: "error-summary", role: "alert", tabindex: "-1", hidden: true });
  const username = el("input", { id: "username", name: "username", type: "text", autocomplete: "username", required: true });
  const password = el("input", { id: "password", name: "password", type: "password", autocomplete: "current-password", required: true });
  const showPassword = el("button", {
    class: "button", type: "button", "aria-pressed": "false", "aria-controls": "password", text: "Show password"
  });
  const submit = el("button", { class: "button button-primary signin-submit", type: "submit", text: "Sign in" });
  wireForm(form, summary, username, password, showPassword, submit);
  form.append(
    summary,
    el("div", { class: "field" }, [el("label", { for: "username", text: "Username" }), username]),
    el("div", { class: "field" }, [
      el("label", { for: "password", text: "Password" }),
      el("div", { class: "password-field" }, [password, showPassword])]),
    submit
  );
  return form;
};

// assembles the sign in view around its form
export const renderSignIn = (main) => {
  main.append(
    el("section", { class: "signin-view", "aria-labelledby": "signin-title" }, [
      el("div", { class: "signin-panel" }, [
        el("h1", { id: "signin-title", text: "Sign in to LumenDesk" }),
        el("p", { class: "view-subtitle", text: "Use any username and password to enter the clinic workspace." }),
        buildForm()
      ])
    ])
  );
};
