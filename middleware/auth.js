const { findUserById } = require("../db");

async function requireAuth(req, res, next) {
  const rejectRequest = () => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(401).json({ error: "Not logged in" });
    }
    res.redirect("/login");
  };

  if (!req.session.userId) {
    return rejectRequest();
  }

  try {
    const user = await findUserById(req.session.userId);

    if (!user) {
      return req.session.destroy(() => rejectRequest());
    }

    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
