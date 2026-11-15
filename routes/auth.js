const express = require("express");
const bcrypt = require("bcrypt");
const { createUser } = require("../db");

const router = express.Router();

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UNIQUE_VIOLATION = "23505";

// Logs a user in. A new session id is created first so an old (possibly
// stolen) session id can't be reused after login.
function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return reject(regenerateError);
      }
      req.session.userId = userId;
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

router.post("/register", async (req, res) => {
  const { email, displayName, password } = req.body;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (typeof displayName !== "string" || displayName.trim() === "") {
    return res.status(400).json({ error: "A display name is required" });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ email, displayName, passwordHash });
    await startSession(req, user.id);
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    console.error("Failed to register user", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
