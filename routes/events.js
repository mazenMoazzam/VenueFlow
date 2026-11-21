const express = require("express");
const {
  createEvent,
  listEventsForUser,
  isEventOwner,
  findEventForUser,
  updateEventForUser,
  deleteEventForUser
} = require("../db");
const {
  isMissing,
  isBlank,
  isValidDate,
  isPositiveInteger,
  isNonNegativeNumber
} = require("./validation");

const router = express.Router();

function validateEventInput(input) {
  const errors = [];
  const hasEnd = !isMissing(input.ends_at);

  if (isBlank(input.name)) {
    errors.push("Name is required");
  }

  if (!isValidDate(input.starts_at)) {
    errors.push("A valid start time is required");
  }

  if (hasEnd && !isValidDate(input.ends_at)) {
    errors.push("End time must be a valid date");
  }

  if (
    hasEnd &&
    isValidDate(input.starts_at) &&
    isValidDate(input.ends_at) &&
    new Date(input.ends_at) < new Date(input.starts_at)
  ) {
    errors.push("End time cannot be before start time");
  }

  if (!isMissing(input.expected_attendees) && !isPositiveInteger(input.expected_attendees)) {
    errors.push("Expected attendees must be a positive whole number");
  }

  if (!isMissing(input.budget) && !isNonNegativeNumber(input.budget)) {
    errors.push("Budget must be zero or more");
  }

  return errors;
}

router.get("/", async (req, res, next) => {
  try {
    res.json(await listEventsForUser(req.user.id));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const input = req.body || {};
  const errors = validateEventInput(input);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const event = await createEvent({ ...input, ownerUserId: req.user.id });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(404).json({ errors: ["Event not found"] });
  }

  try {
    if (!(await isEventOwner(req.params.id, req.user.id))) {
      return res.status(404).json({ errors: ["Event not found"] });
    }

    const event = await findEventForUser(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({ errors: ["Event not found"] });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(404).json({ errors: ["Event not found"] });
  }

  const input = req.body || {};
  const errors = validateEventInput(input);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    if (!(await isEventOwner(req.params.id, req.user.id))) {
      return res.status(404).json({ errors: ["Event not found"] });
    }

    const event = await updateEventForUser(req.params.id, req.user.id, input);
    if (!event) {
      return res.status(404).json({ errors: ["Event not found"] });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(404).json({ errors: ["Event not found"] });
  }

  try {
    if (!(await isEventOwner(req.params.id, req.user.id))) {
      return res.status(404).json({ errors: ["Event not found"] });
    }

    const deleted = await deleteEventForUser(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ errors: ["Event not found"] });
    }

    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
