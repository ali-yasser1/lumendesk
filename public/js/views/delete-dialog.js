// the confirm dialog shown before an appointment is deleted
import { el, showToast } from "../ui.js";
import { deleteAppointment } from "../api.js";
import { formatDate, formatTime } from "../format.js";

// builds the dialog markup with a heading linked by aria labelledby
const buildDialog = (appointment) => {
  const cancel = el("button", { class: "button button-ghost", type: "button", text: "Cancel" });
  const confirm = el("button", { class: "button button-danger", type: "button", text: "Delete" });
  const dialog = el("dialog", { class: "modal glass", "aria-labelledby": "delete-title" }, [
    el("div", { class: "modal-inner" }, [
      el("h2", { id: "delete-title", text: "Delete appointment?" }),
      el("p", {
        text: `Delete the appointment for ${appointment.patient_name} on ${formatDate(appointment.date)} at ${formatTime(appointment.time)}? This cannot be undone.`
      }),
      el("div", { class: "modal-actions" }, [cancel, confirm])
    ])
  ]);
  return { cancel, confirm, dialog };
};

// opens the dialog over the page and runs the callback after a delete
export const openDeleteDialog = (appointment, opener, main, onDone) => {
  const { cancel, confirm, dialog } = buildDialog(appointment);
  let removed = false;

  // removes the dialog and returns focus to the button that opened it
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (!removed && opener.isConnected) {
      opener.focus();
    }
  });

  cancel.addEventListener("click", () => dialog.close());

  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    cancel.disabled = true;
    confirm.textContent = "Deleting...";
    try {
      await deleteAppointment(appointment.id);
      removed = true;
      dialog.close();
      onDone();
    } catch (error) {
      showToast("The appointment could not be deleted. Try again.", "error");
      confirm.disabled = false;
      cancel.disabled = false;
      confirm.textContent = "Delete";
      confirm.focus();
    }
  });

  main.append(dialog);
  dialog.showModal();
  cancel.focus();
};
