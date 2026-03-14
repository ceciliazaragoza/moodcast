import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.VITE_POSTGRES_URL ||
  process.env.VITE_SESSION_POOLER_URL;

let pool = globalThis.__moodcastTaskPool;

if (!pool && connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  globalThis.__moodcastTaskPool = pool;
}

const missingDb = (res) =>
  res.status(500).json({
    ok: false,
    error: "POSTGRES_URL is not configured on the server.",
  });

export default async function handler(req, res) {
  if (!pool) {
    return missingDb(res);
  }

  try {
    if (req.method === "GET") {
      const email = req.query?.email;
      if (!email) {
        return res.status(400).json({ ok: false, error: "email is required." });
      }

      const result = await pool.query(
        `select created_at, description, completed, email
         from task
         where email = $1
         order by created_at desc`,
        [email],
      );

      return res.status(200).json({ ok: true, tasks: result.rows });
    }

    if (req.method === "POST") {
      const { email, description, completed = false } = req.body || {};
      if (!email || !description) {
        return res.status(400).json({
          ok: false,
          error: "email and description are required.",
        });
      }

      const result = await pool.query(
        `insert into task (description, completed, email)
         values ($1, $2, $3)
         returning created_at, description, completed, email`,
        [description, Boolean(completed), email],
      );

      return res.status(201).json({ ok: true, task: result.rows[0] });
    }

    if (req.method === "DELETE") {
      const { email, description } = req.body || {};
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
        return res.status(404).json({ ok: false, error: "No matching task found." });
      }

      return res.status(200).json({ ok: true, deletedTask: result.rows[0] });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use GET, POST, or DELETE.",
    });
  } catch (error) {
    console.error("api/tasks failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Task request failed.",
    });
  }
}
