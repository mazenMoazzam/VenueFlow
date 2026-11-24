const express = require("express");
const bcrypt = require("bcrypt");
const { createUser, findUserByEmail } = require("../db");

const router = express.Router();

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UNIQUE_VIOLATION = "23505";

const LOGIN_ERROR = "Incorrect email or password";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

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

router.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("login", { error: null, email: "" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Re-renders the login page with an error, keeping the email the user typed
  const showError = (status, error) =>
    res.status(status).render("login", { error, email: typeof email === "string" ? email : "" });

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return showError(400, "Email and password are required");
  }

  try {
    const user = await findUserByEmail(email);
    const passwordMatches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !passwordMatches) {
      return showError(401, LOGIN_ERROR);
    }

    await startSession(req, user.id);
    res.redirect("/");
  } catch (error) {
    console.error("Failed to log in", error);
    showError(500, "Something went wrong. Please try again.");
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Failed to log out", error);
      return res.status(500).send("Something went wrong");
    }
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

module.exports = router;
