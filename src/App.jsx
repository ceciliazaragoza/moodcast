import { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { getForecast } from "./services/weatherApi";
import "./App.css";

const parseGoogleCredential = (token) => {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
};

const readApiResponse = async (response) => {
  const rawBody = await response.text();
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(
      `API did not return JSON. Status ${response.status}. Body: ${rawBody.slice(0, 160)}`,
    );
  }
};

const initialTaskEmail =
  typeof window !== "undefined" ? localStorage.getItem("moodcast_email") || "" : "";

function WeatherPage() {
  const [location, setLocation] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [taskEmail, setTaskEmail] = useState(initialTaskEmail);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [taskItems, setTaskItems] = useState([]);
  const [taskError, setTaskError] = useState("");
  const [taskMessage, setTaskMessage] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);
  const navigate = useNavigate();
  const hasGoogleClientId = Boolean(
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
  );

  const loadTasks = async (emailToLoad = taskEmail) => {
    if (!emailToLoad) {
      setTaskError("Enter an email before loading tasks.");
      return;
    }

    setTaskLoading(true);
    setTaskError("");
    setTaskMessage("");

    try {
      const response = await fetch(
        `/api/tasks?email=${encodeURIComponent(emailToLoad)}`,
      );
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || `Failed to load tasks (HTTP ${response.status}).`,
        );
      }

      setTaskItems(result?.tasks ?? []);
      setTaskMessage("Tasks loaded.");
    } catch (error) {
      setTaskError(error.message || "Could not load tasks.");
    } finally {
      setTaskLoading(false);
    }
  };

  const addTask = async () => {
    if (!taskEmail || !taskDescription) {
      setTaskError("Email and task description are required.");
      return;
    }

    setTaskLoading(true);
    setTaskError("");
    setTaskMessage("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: taskEmail,
          description: taskDescription,
          completed: taskCompleted,
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || `Failed to add task (HTTP ${response.status}).`,
        );
      }

      setTaskDescription("");
      setTaskCompleted(false);
      setTaskMessage("Task added.");
      await loadTasks(taskEmail);
    } catch (error) {
      setTaskError(error.message || "Could not add task.");
    } finally {
      setTaskLoading(false);
    }
  };

  const deleteTask = async (description) => {
    if (!taskEmail) {
      setTaskError("Email is required to delete tasks.");
      return;
    }

    setTaskLoading(true);
    setTaskError("");
    setTaskMessage("");

    try {
      const response = await fetch("/api/tasks", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: taskEmail,
          description,
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || `Failed to delete task (HTTP ${response.status}).`,
        );
      }

      setTaskMessage("Task deleted.");
      await loadTasks(taskEmail);
    } catch (error) {
      setTaskError(error.message || "Could not delete task.");
    } finally {
      setTaskLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      setLoginError("");
      setIsLoggingIn(true);

      const token = credentialResponse.credential;
      if (!token) {
        throw new Error("Google did not return an ID token.");
      }

      const profile = parseGoogleCredential(token);
      if (profile.email) {
        setTaskEmail(profile.email);
        localStorage.setItem("moodcast_email", profile.email);
      }
      navigate("/profile", {
        state: {
          user: {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            avatarUrl: profile.picture,
          },
        },
      });
    } catch (error) {
      console.error("Google login failed:", error);
      setLoginError(error.message || "Unable to sign in right now.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="page">
      <div className="page-topbar">
        <button
          type="button"
          className="auth-button"
          onClick={() => setShowLogin((current) => !current)}
        >
          Sign up / Log in
        </button>
        {showLogin ? (
          <div className="auth-popover">
            {hasGoogleClientId ? (
              <GoogleOAuthProvider
                clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ""}
              >
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => {
                    console.error("Google login failed.");
                    setLoginError("Google login failed. Please try again.");
                  }}
                />
              </GoogleOAuthProvider>
            ) : (
              <p className="error">
                Missing VITE_GOOGLE_OAUTH_CLIENT_ID in .env
              </p>
            )}
            {isLoggingIn ? <p>Signing in...</p> : null}
            {loginError ? <p className="error">{loginError}</p> : null}
          </div>
        ) : null}
      </div>
      <section className="card">
        <h1>Moodcast</h1>
        <Link className="link" to="/test">
          Open Supabase Test
        </Link>
        <input
          type="text"
          placeholder="Enter location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button
          onClick={async () => {
            try {
              const weatherData = await getForecast(location);
              console.log(weatherData);
            } catch (error) {
              console.error("Error fetching weather data:", error);
            }
          }}
        >
          Get weather forecast
        </button>

        <div className="task-panel">
          <h2>Tasks</h2>
          <input
            type="email"
            placeholder="user@example.com"
            value={taskEmail}
            onChange={(event) => {
              setTaskEmail(event.target.value);
              localStorage.setItem("moodcast_email", event.target.value);
            }}
          />
          <input
            type="text"
            placeholder="Task description"
            value={taskDescription}
            onChange={(event) => setTaskDescription(event.target.value)}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={taskCompleted}
              onChange={(event) => setTaskCompleted(event.target.checked)}
            />
            Completed
          </label>
          <div className="task-actions">
            <button type="button" onClick={addTask} disabled={taskLoading}>
              Add Task
            </button>
            <button
              type="button"
              onClick={() => loadTasks(taskEmail)}
              disabled={taskLoading}
            >
              Load Tasks
            </button>
          </div>

          {taskLoading ? <p>Working...</p> : null}
          {taskMessage ? <p className="success">{taskMessage}</p> : null}
          {taskError ? <p className="error">{taskError}</p> : null}

          {taskItems.length > 0 ? (
            <div className="task-list">
              {taskItems.map((task) => (
                <div
                  className="task-item"
                  key={`${task.created_at}-${task.description}`}
                >
                  <p>
                    {task.description} | {task.completed ? "Completed" : "Open"}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.description)}
                    disabled={taskLoading}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function TestPage() {
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

function ProfilePage() {
  const location = useLocation();
  const user = location.state?.user;

  return (
    <main className="page">
      <section className="card">
        <h1>Profile</h1>
        {user ? (
          <>
            <p>Welcome, {user.name || "Google User"}.</p>
            <p>{user.email}</p>
          </>
        ) : (
          <p>This is a placeholder profile page.</p>
        )}
        <Link className="link" to="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<WeatherPage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
