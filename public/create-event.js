import { showErrors, clearErrors } from "./form-errors.js";

const form = document.getElementById("create-event-form");
const errorList = document.getElementById("form-errors");
const submitButton = form.querySelector('button[type="submit"]');

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

async function submitEvent(submission) {
  submission.preventDefault();
  submitButton.disabled = true;
  clearErrors(errorList);

  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readFormValues())
    });
    const body = await response.json();

    if (!response.ok) {
      showErrors(errorList, body.errors || ["Unable to create the event."]);
      return;
    }

    window.location.href = `/event.html?id=${encodeURIComponent(body.id)}`;
  } catch {
    showErrors(errorList, ["Unable to create the event. Please try again."]);
  } finally {
    submitButton.disabled = false;
  }
}

form.addEventListener("submit", submitEvent);
