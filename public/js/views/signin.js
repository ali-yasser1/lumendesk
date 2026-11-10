import { announce, el, showToast } from "../ui.js";

const fieldMessages = {
  username: "Enter your username",
  password: "Enter your password"
};

const setFieldError = (input, show) => {
  const error = document.querySelector(`#${input.id}-error`);
  if (show) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
  error.hidden = !show;
};

const validateField = (input) => {
  const empty = input.value.trim() === "";
  setFieldError(input, empty);
  return empty;
};

const buildSummary = (fields) => {
  const count = fields.length;
  const heading = `Please fix ${count} ${count === 1 ? "problem" : "problems"}`;
  const list = el("ul", {}, fields.map((field) => el("li", {}, el("a", {
    href: `#${field.id}`,
    text: fieldMessages[field.id],
    onClick: (event) => {
      event.preventDefault();
      field.focus();
    }
  }))));
  return [el("h2", { text: heading }), list];
};

export const renderSignIn = (main) => {
  const form = el("form", { class: "signin-form", novalidate: true });
  const summary = el("div", { class: "error-summary", role: "alert", tabindex: "-1", hidden: true });
  const username = el("input", {
    id: "username",
    name: "username",
    type: "text",
    autocomplete: "username",
    required: true,
    "aria-describedby": "username-error"
  });
  const password = el("input", {
    id: "password",
    name: "password",
    type: "password",
    autocomplete: "current-password",
    required: true,
    "aria-describedby": "password-error"
  });
  const usernameError = el("p", { class: "field-error", id: "username-error", hidden: true }, [
    el("span", { class: "field-error-icon", "aria-hidden": "true", text: "!" }),
    el("span", { text: fieldMessages.username })
  ]);
  const passwordError = el("p", { class: "field-error", id: "password-error", hidden: true }, [
    el("span", { class: "field-error-icon", "aria-hidden": "true", text: "!" }),
    el("span", { text: fieldMessages.password })
  ]);
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
      setFieldError(username, false);
    }
  });
  password.addEventListener("input", () => {
    if (password.value.trim()) {
      setFieldError(password, false);
    }
  });

  form.append(
    summary,
    el("div", { class: "field" }, [
      el("label", { for: "username", text: "Username" }),
      username,
      usernameError
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "password", text: "Password" }),
      el("div", { class: "password-field" }, [password, showPassword]),
      passwordError
    ]),
    submit
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalid = [username, password].filter((input) => validateField(input));
    if (invalid.length > 0) {
      summary.replaceChildren(...buildSummary(invalid));
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
