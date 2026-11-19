const message = document.getElementById("event-message");
const details = document.getElementById("event-details");

function showField(id, value) {
  if (value === null || value === undefined) {
    value = "—";
  }
  document.getElementById(id).textContent = value;
}

async function loadEvent() {
  let id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    message.textContent = "Event not found.";
    return;
  }

  try {
    let response = await fetch("/api/events/" + encodeURIComponent(id));
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

    details.hidden = false;
    message.hidden = true;
  } catch (error) {
    message.textContent = "Unable to load this event. Please try again.";
  }
}

loadEvent();
