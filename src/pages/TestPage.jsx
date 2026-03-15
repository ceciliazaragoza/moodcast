import { useState } from "react";
import { Link } from "react-router-dom";

export default function TestPage() {
  const [status, setStatus] = useState("idle");
  const [row, setRow] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [meta, setMeta] = useState(null);

  const runTest = async () => {
    setStatus("loading");
    setErrorMessage("");
    setRow(null);
    setMeta(null);

    try {
      const response = await fetch("/api/test-db");
      const rawBody = await response.text();
      let result = null;

      if (rawBody) {
        try {
          result = JSON.parse(rawBody);
        } catch {
          throw new Error(
            `API did not return JSON. Status ${response.status}. Body: ${rawBody.slice(0, 160)}`,
          );
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "API route /api/test-db was not found. Redeploy after adding api/test-db.js.",
          );
        }
        throw new Error(
          result?.error ||
            `Failed to query Postgres (HTTP ${response.status}).`,
        );
      }

      setRow(result?.row ?? null);
      setMeta({
        rowCount: result?.rowCount ?? 0,
      });
      setStatus("success");
    } catch (error) {
      setErrorMessage(error.message || "Unknown error while querying hello.");
      setStatus("error");
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>Postgres Test</h1>
        <p>Calls a backend endpoint that runs SELECT * FROM hello LIMIT 1.</p>
        <button type="button" onClick={runTest}>
          Run Hello Query
        </button>

        {status === "loading" ? <p>Running test...</p> : null}

        {status === "success" ? (
          <div className="result-block">
            <p className="success">Connected successfully.</p>
            <p>Rows returned: {meta?.rowCount ?? 0}</p>
            <pre>{JSON.stringify(row, null, 2)}</pre>
          </div>
        ) : null}

        {status === "error" ? <p className="error">{errorMessage}</p> : null}

        <Link className="link" to="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
