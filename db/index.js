const fs = require("fs");
const path = require("path");
const { Pool, types } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DATE_TYPE_ID = 1082;
// Keep DATE columns as "YYYY-MM-DD"; pg's default local-midnight Date shifts a day when serialized to UTC.
types.setTypeParser(DATE_TYPE_ID, (value) => value);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
}

async function createUser({ email, displayName, passwordHash }) {
  const result = await pool.query(
    `
      INSERT INTO users (email, display_name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, display_name, created_at, updated_at
    `,
    [email.trim().toLowerCase(), displayName.trim(), passwordHash]
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `
      SELECT id, email, display_name, password_hash, created_at, updated_at
      FROM users
      WHERE email = $1
    `,
    [email.trim().toLowerCase()]
  );

  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await pool.query(
    `
      SELECT id, email, display_name, created_at, updated_at
      FROM users
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function listUsers() {
  const result = await pool.query(
    `
      SELECT id, email, display_name, created_at, updated_at
      FROM users
      ORDER BY id
    `
  );

  return result.rows;
}

function trimOrNull(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function numberOrNull(value) {
  return value === undefined || value === null || value === "" ? null : Number(value);
}

async function createEvent({
  ownerUserId,
  name,
  description,
  starts_at,
  ends_at,
  location,
  budget,
  expected_attendees
}) {
  const result = await pool.query(
    `
      INSERT INTO events
        (owner_user_id, name, description, starts_at, ends_at, location, budget, expected_attendees)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      ownerUserId,
      name.trim(),
      trimOrNull(description),
      starts_at,
      ends_at || null,
      trimOrNull(location),
      numberOrNull(budget),
      numberOrNull(expected_attendees)
    ]
  );

  return result.rows[0];
}

async function listEventsForUser(userId) {
  const result = await pool.query(
    `
      SELECT *
      FROM events
      WHERE owner_user_id = $1
      ORDER BY starts_at
    `,
    [userId]
  );

  return result.rows;
}

async function isEventOwner(eventId, userId) {
  const result = await pool.query(
    `
      SELECT 1
      FROM events
      WHERE id = $1 AND owner_user_id = $2
    `,
    [eventId, userId]
  );

  return result.rowCount > 0;
}

async function createTask({ eventId, title, dueDate }) {
  const result = await pool.query(
    `
      INSERT INTO tasks (event_id, title, due_date)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [eventId, title.trim(), dueDate || null]
  );

  return result.rows[0];
}

async function listTasksForUser(userId) {
  const result = await pool.query(
    `
      SELECT tasks.*, events.name AS event_name
      FROM tasks
      JOIN events ON events.id = tasks.event_id
      WHERE events.owner_user_id = $1
      ORDER BY tasks.completed_at IS NOT NULL, tasks.due_date NULLS LAST, tasks.id
    `,
    [userId]
  );

  return result.rows;
}

async function setTaskCompleted(taskId, userId, completed) {
  const result = await pool.query(
    `
      UPDATE tasks
      SET completed_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
          updated_at = NOW()
      FROM events
      WHERE tasks.id = $1
        AND events.id = tasks.event_id
        AND events.owner_user_id = $2
      RETURNING tasks.*
    `,
    [taskId, userId, completed]
  );

  return result.rows[0] || null;
}

module.exports = {
  pool,
  initializeDatabase,
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  createEvent,
  listEventsForUser,
  isEventOwner,
  createTask,
  listTasksForUser,
  setTaskCompleted
};
