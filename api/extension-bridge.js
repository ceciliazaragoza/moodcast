import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.VITE_POSTGRES_URL ||
  process.env.VITE_SESSION_POOLER_URL;

let pool = globalThis.__moodcastBridgePool;
let initPromise = globalThis.__moodcastBridgeInitPromise;

if (!pool && connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  globalThis.__moodcastBridgePool = pool;
}

const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const missingDb = (res) => {
  setCorsHeaders(res);
  return res.status(500).json({
    ok: false,
    error: "POSTGRES_URL is not configured on the server.",
  });
};

const ensureTable = async () => {
  if (!pool) {
    return;
  }

  if (!initPromise) {
    initPromise = pool.query(`
      create table if not exists extension_bridge_messages (
        id bigserial primary key,
        channel text not null,
        message_type text not null,
        payload jsonb not null,
        sender text,
        created_at timestamptz not null default now()
      )
    `);
    globalThis.__moodcastBridgeInitPromise = initPromise;
  }

  await initPromise;
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!pool) {
    return missingDb(res);
  }

  try {
    await ensureTable();

    if (req.method === "POST") {
      const {
        channel = "default",
        type,
        payload,
        sender = "web-app",
      } = req.body || {};

      if (!type) {
        return res.status(400).json({
          ok: false,
          error: "type is required.",
        });
      }

      if (payload === undefined) {
        return res.status(400).json({
          ok: false,
          error: "payload is required.",
        });
      }

      const insertResult = await pool.query(
        `insert into extension_bridge_messages (channel, message_type, payload, sender)
         values ($1, $2, $3::jsonb, $4)
         returning id, channel, message_type as type, payload, sender, created_at`,
        [channel, type, JSON.stringify(payload), sender],
      );

      return res.status(201).json({
        ok: true,
        message: insertResult.rows[0],
      });
    }

    if (req.method === "GET") {
      const channel = req.query?.channel || "default";
      const afterId = Number.parseInt(req.query?.afterId ?? "0", 10);
      const limitRaw = Number.parseInt(req.query?.limit ?? "25", 10);
      const limit = Number.isNaN(limitRaw)
        ? 25
        : Math.min(Math.max(limitRaw, 1), 100);

      if (Number.isNaN(afterId) || afterId < 0) {
        return res.status(400).json({
          ok: false,
          error: "afterId must be a non-negative integer.",
        });
      }

      const result = await pool.query(
        `select id, channel, message_type as type, payload, sender, created_at
         from extension_bridge_messages
         where channel = $1 and id > $2
         order by id asc
         limit $3`,
        [channel, afterId, limit],
      );

      return res.status(200).json({
        ok: true,
        messages: result.rows,
        nextAfterId:
          result.rows.length > 0
            ? result.rows[result.rows.length - 1].id
            : afterId,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use OPTIONS, GET, or POST.",
    });
  } catch (error) {
    console.error("api/extension-bridge failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Extension bridge request failed.",
    });
  }
}
