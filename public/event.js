const message = document.getElementById("event-message");
const details = document.getElementById("event-details");

function showField(id, value) {
  if (value === null || value === undefined || value === "") {
    value = "—";
  }
  document.getElementById(id).textContent = value;
}

function formatWhen(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function renderEvent(event) {
  showField("event-name", event.name);
  showField("event-description", event.description || "No description provided.");
  showField("event-start", formatWhen(event.starts_at));
  showField("event-end", formatWhen(event.ends_at));
  showField("event-location", event.location || null);
  showField("event-attendance", event.expected_attendees);
  showField("event-status", event.status);
  document.title = event.name + " | VenueFlow";
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

function setupEditForm(event, eventUrl) {
  let form = document.getElementById("edit-event-form");
  let editButton = document.getElementById("edit-event");
  let cancelButton = document.getElementById("cancel-edit");
  let saveMessage = document.getElementById("save-message");
  let saveButton = form.querySelector('button[type="submit"]');

  function fillForm() {
    form.elements.name.value = event.name || "";
    form.elements.description.value = event.description || "";
    form.elements.location.value = event.location || "";
    form.elements.expected_attendees.value = event.expected_attendees ?? "";
  }

  function hideForm() {
    form.hidden = true;
    editButton.setAttribute("aria-expanded", "false");
    saveMessage.hidden = true;
  }

  form.addEventListener("submit", async function (submitEvent) {
    submitEvent.preventDefault();
    saveButton.disabled = true;
    saveMessage.hidden = true;

    try {
      let response = await fetch(eventUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.elements.name.value,
          description: form.elements.description.value,
          location: form.elements.location.value,
          expected_attendees: form.elements.expected_attendees.value,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          budget: event.budget
        })
      });
      let body = await response.json();

      if (!response.ok) {
        saveMessage.textContent = (body.errors || ["Unable to save this event."]).join(" ");
        saveMessage.hidden = false;
        return;
      }

      Object.assign(event, body);
      renderEvent(event);
      hideForm();
      editButton.focus();
    } catch (error) {
      saveMessage.textContent = "Unable to save this event. Please try again.";
      saveMessage.hidden = false;
    } finally {
      saveButton.disabled = false;
    }
  });

  editButton.addEventListener("click", function () {
    fillForm();
    form.hidden = false;
    editButton.setAttribute("aria-expanded", "true");
    form.elements.name.focus();
  });

  cancelButton.addEventListener("click", function () {
    hideForm();
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
    renderEvent(event);

    document.getElementById("delete-event").addEventListener("click", function () {
      return deleteEvent(eventUrl, event.name);
    });

    setupEditForm(event, eventUrl);
    details.hidden = false;
    message.hidden = true;
  } catch (error) {
    message.textContent = "Unable to load this event. Please try again.";
  }
}

loadEvent();
