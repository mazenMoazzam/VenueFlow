const { createUser, findUserByEmail } = require("../db");

const DEMO_EMAIL = "demo@venueflow.local";

// Placeholder until login (#22) sets req.user; events.owner_user_id is NOT NULL.
// The "!" hash can never match a bcrypt comparison, so the account cannot log in.
async function attachDemoUser(req, _res, next) {
  try {
    req.user =
      (await findUserByEmail(DEMO_EMAIL)) ||
      (await createUser({ email: DEMO_EMAIL, displayName: "Demo User", passwordHash: "!" }));
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = attachDemoUser;
