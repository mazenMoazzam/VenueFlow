const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

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

module.exports = {
  pool,
  initializeDatabase,
  createUser,
  findUserByEmail,
  findUserById,
  listUsers
};
