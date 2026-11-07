const events = [];

function listEvents() {
  return events;
}

function createEvent(input) {
  const event = {
    id: events.length + 1,
    ...input,
    status: "Planning",
    progress: 0
  };

  events.push(event);
  return event;
}

module.exports = { listEvents, createEvent };
