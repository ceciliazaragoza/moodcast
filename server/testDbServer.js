import express from "express";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const app = express();
const port = 8787;

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.VITE_POSTGRES_URL ||
  process.env.VITE_SESSION_POOLER_URL;

if (!connectionString) {
  console.error("Missing POSTGRES_URL (or VITE_POSTGRES_URL) in environment.");
}

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : null;

app.get("/api/test-db", async (_req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: "Database connection string is not configured.",
      });
    }

    const result = await pool.query("select * from hello limit 1;");
    return res.json({ row: result.rows[0] ?? null });
  } catch (error) {
    console.error("Postgres query failed:", error);
    return res.status(500).json({
      error: error.message || "Query failed",
    });
  }
});

app.listen(port, () => {
  console.log(`Postgres test server running on http://localhost:${port}`);
});
