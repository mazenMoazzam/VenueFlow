const express = require("express");
const path = require("path");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const emptyRouter = require("./routes/empty");
const authRouter = require("./routes/auth");
const { requireAuth } = require("./middleware/auth");
const { pool, initializeDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production");
}

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "venueflow-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PRODUCTION,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "venueflow" });
});

app.use("/api/empty", emptyRouter);
app.use("/", authRouter);

app.get("/", requireAuth, (_req, res) => {
  res.render("planner");
});

app.use((_req, res) => {
  res.status(404).send("Page not found");
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`VenueFlow is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to initialize the database", error);
    process.exitCode = 1;
  }
}

start();
