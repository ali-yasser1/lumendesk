import { announce, el, showToast } from "../ui.js";
import { buildSummary, setFieldError } from "../form.js";

const messages = {
  username: "Enter your username",
  password: "Enter your password"
};

const validateField = (input) => {
  const empty = input.value.trim() === "";
  setFieldError(input, empty ? messages[input.id] : "");
  return empty;
};

export const renderSignIn = (main) => {
  const form = el("form", { class: "signin-form", novalidate: true });
  const summary = el("div", { class: "error-summary", role: "alert", tabindex: "-1", hidden: true });
  const username = el("input", {
    id: "username",
    name: "username",
    type: "text",
    autocomplete: "username",
    required: true
  });
  const password = el("input", {
    id: "password",
    name: "password",
    type: "password",
    autocomplete: "current-password",
    required: true
  });
  const showPassword = el("button", {
    class: "button button-ghost",
    type: "button",
    "aria-pressed": "false",
    "aria-controls": "password",
    text: "Show password"
  });
  const submit = el("button", { class: "button button-primary signin-submit", type: "submit", text: "Sign in" });

  showPassword.addEventListener("click", () => {
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    showPassword.setAttribute("aria-pressed", String(!showing));
    showPassword.textContent = showing ? "Show password" : "Hide password";
  });

  username.addEventListener("blur", () => validateField(username));
  password.addEventListener("blur", () => validateField(password));
  username.addEventListener("input", () => {
    if (username.value.trim()) {
      setFieldError(username, "");
    }
  });
  password.addEventListener("input", () => {
    if (password.value.trim()) {
      setFieldError(password, "");
    }
  });

  form.append(
    summary,
    el("div", { class: "field" }, [
      el("label", { for: "username", text: "Username" }),
      username
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "password", text: "Password" }),
      el("div", { class: "password-field" }, [password, showPassword])
    ]),
    submit
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalid = [username, password].filter((input) => validateField(input));
    if (invalid.length > 0) {
      summary.replaceChildren(...buildSummary(invalid, messages));
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submit.replaceChildren(
      el("span", { class: "spinner", "aria-hidden": "true" }),
      document.createTextNode("Signing in...")
    );
    announce("Signing in");
    window.setTimeout(() => {
      const name = username.value.trim();
      sessionStorage.setItem("lumen-user", name);
      document.dispatchEvent(new CustomEvent("lumen:authchange"));
      showToast(`Welcome back, ${name}`, "success");
      window.setTimeout(() => {
        location.hash = "#/dashboard";
      }, 300);
    }, 1200);
  });

  main.append(
    el("section", { class: "signin-view", "aria-labelledby": "signin-title" }, [
      el("div", { class: "signin-panel glass" }, [
        el("h1", { id: "signin-title", text: "Sign in to LumenDesk" }),
        el("p", { class: "view-subtitle", text: "Use any username and password to enter the clinic workspace." }),
        form
      ])
    ])
  );
};
