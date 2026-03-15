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

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : null;

app.use(express.json());

app.get("/api/test-db", async (_req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        ok: false,
        error: "POSTGRES_URL is not configured on the server.",
      });
    }

    const result = await pool.query("select * from hello limit 1;");
    return res.json({
      ok: true,
      row: result.rows[0] ?? null,
      rowCount: result.rowCount,
    });
  } catch (error) {
    console.error("test-db query failed:", error);
    return res
      .status(500)
      .json({ ok: false, error: error.message || "Query failed" });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        ok: false,
        error: "POSTGRES_URL is not configured on the server.",
      });
    }

    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required." });
    }

    const result = await pool.query(
      `select id, created_at, description, completed, email
       from task
       where email = $1
       order by created_at desc`,
      [email],
    );

    return res.json({ ok: true, tasks: result.rows });
  } catch (error) {
    console.error("list tasks failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to list tasks.",
    });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        ok: false,
        error: "POSTGRES_URL is not configured on the server.",
      });
    }

    const { email, description, completed = false } = req.body;
    if (!email || !description) {
      return res.status(400).json({
        ok: false,
        error: "email and description are required.",
      });
    }

    const result = await pool.query(
      `insert into task (description, completed, email)
       values ($1, $2, $3)
       returning id, created_at, description, completed, email`,
      [description, Boolean(completed), email],
    );

    return res.status(201).json({ ok: true, task: result.rows[0] });
  } catch (error) {
    console.error("add task failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to add task.",
    });
  }
});

app.delete("/api/tasks", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        ok: false,
        error: "POSTGRES_URL is not configured on the server.",
      });
    }

    const { email, description } = req.body;
    if (!email || !description) {
      return res.status(400).json({
        ok: false,
        error: "email and description are required.",
      });
    }

    const result = await pool.query(
      `with target as (
         select ctid
         from task
         where email = $1 and description = $2
         order by created_at desc
         limit 1
       )
       delete from task t
       using target
       where t.ctid = target.ctid
       returning t.created_at, t.description, t.completed, t.email`,
      [email, description],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "No matching task found." });
    }

    return res.json({ ok: true, deletedTask: result.rows[0] });
  } catch (error) {
    console.error("delete task failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to delete task.",
    });
  }
});

app.patch("/api/tasks", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        ok: false,
        error: "POSTGRES_URL is not configured on the server.",
      });
    }

    const { email, id, completed } = req.body;
    if (
      !email ||
      (typeof id !== "number" && typeof id !== "string") ||
      id === "" ||
      typeof completed !== "boolean"
    ) {
      return res.status(400).json({
        ok: false,
        error: "email, id, and completed(boolean) are required.",
      });
    }

    const result = await pool.query(
      `update task
       set completed = $3
       where email = $1 and id = $2::bigint
       returning id, created_at, description, completed, email`,
      [email, id, completed],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        error: "No matching task found to update.",
      });
    }

    return res.json({ ok: true, task: result.rows[0] });
  } catch (error) {
    console.error("update task failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to update task.",
    });
  }
});

app.listen(port, () => {
  console.log(`Postgres API server running on http://localhost:${port}`);
});
