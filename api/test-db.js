import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.VITE_POSTGRES_URL ||
  process.env.VITE_SESSION_POOLER_URL;

let pool = globalThis.__moodcastPgPool;

if (!pool && connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  globalThis.__moodcastPgPool = pool;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  if (!pool) {
    return res.status(500).json({
      ok: false,
      error: "POSTGRES_URL is not configured on the server.",
    });
  }

  try {
    const result = await pool.query("select * from hello limit 1;");

    return res.status(200).json({
      ok: true,
      row: result.rows[0] ?? null,
      rowCount: result.rowCount,
    });
  } catch (error) {
    console.error("api/test-db query failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Database query failed.",
    });
  }
}
