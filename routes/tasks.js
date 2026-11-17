const express = require("express");
const { isEventOwner, createTask, listTasksForUser, setTaskCompleted } = require("../db");
const { isMissing, isBlank, isValidDate, isPositiveInteger } = require("./validation");

const router = express.Router();

function validateTaskInput(input) {
  const errors = [];

  if (isBlank(input.title)) {
    errors.push("Title is required");
  }

  if (!isPositiveInteger(input.event_id)) {
    errors.push("Choose an event for this task");
  }

  if (!isMissing(input.due_date) && !isValidDate(input.due_date)) {
    errors.push("Due date must be a valid date");
  }

  return errors;
}

router.get("/", async (req, res, next) => {
  try {
    res.json(await listTasksForUser(req.user.id));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const input = req.body || {};
  const errors = validateTaskInput(input);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    if (!(await isEventOwner(input.event_id, req.user.id))) {
      return res.status(404).json({ errors: ["Event not found"] });
    }

    const task = await createTask({
      eventId: input.event_id,
      title: input.title,
      dueDate: input.due_date
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const { completed } = req.body || {};

  if (!isPositiveInteger(req.params.id)) {
    return res.status(404).json({ errors: ["Task not found"] });
  }

  if (typeof completed !== "boolean") {
    return res.status(400).json({ errors: ["completed must be true or false"] });
  }

  try {
    const task = await setTaskCompleted(req.params.id, req.user.id, completed);

    if (!task) {
      return res.status(404).json({ errors: ["Task not found"] });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
