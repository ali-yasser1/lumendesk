import { el } from "../ui.js";

export const renderPlaceholder = (main, title, message) => {
  main.append(
    el("section", { class: "placeholder-panel glass", "aria-labelledby": "placeholder-title" }, [
      el("h1", { id: "placeholder-title", text: title }),
      el("p", { text: message })
    ])
  );
};
