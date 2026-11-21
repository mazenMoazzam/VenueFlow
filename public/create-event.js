const form = document.getElementById("create-event-form");
const errorList = document.getElementById("form-errors");
const submitButton = form.querySelector('button[type="submit"]');
const dialog = document.getElementById("create-event-dialog");

if (dialog) {
  const openButton = document.getElementById("open-create-event");
  const closeButton = dialog.querySelector(".dialog-close");
  const cancelButton = dialog.querySelector(".dialog-cancel");
  const closeDialog = () => dialog.close();

  openButton.addEventListener("click", () => dialog.showModal());
  closeButton.addEventListener("click", closeDialog);
  cancelButton.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
}

function toIsoOrEmpty(localDateTime) {
  return localDateTime ? new Date(localDateTime).toISOString() : "";
}

function readFormValues() {
  const values = Object.fromEntries(new FormData(form));
  return {
    ...values,
    starts_at: toIsoOrEmpty(values.starts_at),
    ends_at: toIsoOrEmpty(values.ends_at)
  };
}

function showErrors(messages) {
  errorList.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    })
  );
  errorList.hidden = false;
  errorList.scrollIntoView({ block: "nearest" });
}

async function submitEvent(submission) {
  submission.preventDefault();
  submitButton.disabled = true;
  errorList.hidden = true;

  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readFormValues())
    });
    const body = await response.json();

    if (!response.ok) {
      showErrors(body.errors || ["Unable to create the event."]);
      return;
    }

    window.location.href = `/event.html?id=${encodeURIComponent(body.id)}`;
  } catch {
    showErrors(["Unable to create the event. Please try again."]);
  } finally {
    submitButton.disabled = false;
  }
}

form.addEventListener("submit", submitEvent);
