const express = require("express");
const { createEvent, listEventsForUser } = require("../db");
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

module.exports = router;
