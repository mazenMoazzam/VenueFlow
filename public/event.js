const message = document.getElementById("event-message");
const details = document.getElementById("event-details");

function showField(id, value) {
  if (value === null || value === undefined) {
    value = "—";
  }
  document.getElementById(id).textContent = value;
}

async function deleteEvent(eventUrl, eventName) {
  if (!window.confirm("Delete " + eventName + "?")) {
    return;
  }

  let button = document.getElementById("delete-event");
  let deleteMessage = document.getElementById("delete-message");
  button.disabled = true;
  deleteMessage.hidden = true;

  try {
    let response = await fetch(eventUrl, { method: "DELETE" });
    if (response.status === 204) {
      window.location.href = "/";
      return;
    }

    deleteMessage.textContent = "Unable to delete this event.";
  } catch (error) {
    deleteMessage.textContent = "Unable to delete this event.";
  }

  deleteMessage.hidden = false;
  button.disabled = false;
}

function setupEditForm(event) {
  let form = document.getElementById("edit-event-form");
  let editButton = document.getElementById("edit-event");
  let cancelButton = document.getElementById("cancel-edit");

  form.addEventListener("submit", function (submitEvent) {
    submitEvent.preventDefault();
  });

  editButton.addEventListener("click", function () {
    form.elements.name.value = event.name || "";
    form.elements.description.value = event.description || "";
    form.elements.location.value = event.location || "";
    form.elements.expected_attendance.value = event.expected_attendance;

    form.hidden = false;
    editButton.setAttribute("aria-expanded", "true");
    form.elements.name.focus();
  });

  cancelButton.addEventListener("click", function () {
    form.hidden = true;
    editButton.setAttribute("aria-expanded", "false");
    editButton.focus();
  });
}

async function loadEvent() {
  let id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    message.textContent = "Event not found.";
    return;
  }

  let eventUrl = "/api/events/" + encodeURIComponent(id);
  try {
    let response = await fetch(eventUrl);
    if (response.status === 404) {
      message.textContent = "Event not found.";
      return;
    }
    if (!response.ok) {
      throw new Error("Event request failed");
    }

    let event = await response.json();
    showField("event-name", event.name);
    showField("event-description", event.description || "No description provided.");
    showField("event-start", event.start_time);
    showField("event-end", event.end_time);
    showField("event-location", event.location || null);
    showField("event-attendance", event.expected_attendance);
    showField("event-status", event.status);
    document.title = event.name + " | VenueFlow";

    document.getElementById("delete-event").addEventListener("click", function () {
      return deleteEvent(eventUrl, event.name);
    });

    setupEditForm(event);
    details.hidden = false;
    message.hidden = true;
  } catch (error) {
    message.textContent = "Unable to load this event. Please try again.";
  }
}

loadEvent();
