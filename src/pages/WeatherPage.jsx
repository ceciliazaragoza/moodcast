import { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Link } from "react-router-dom";
import { getForecast } from "../services/weatherApi";

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
  typeof window !== "undefined"
    ? localStorage.getItem("moodcast_email") || ""
    : "";

const initialUserProfile =
  typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("moodcast_user_profile") || "null")
    : null;

export default function WeatherPage() {
  const [location, setLocation] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userProfile, setUserProfile] = useState(initialUserProfile);
  const [taskEmail, setTaskEmail] = useState(initialTaskEmail);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [taskItems, setTaskItems] = useState([]);
  const [taskError, setTaskError] = useState("");
  const [taskMessage, setTaskMessage] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);
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
      const nextUserProfile = {
        name: profile.name || profile.email || "User",
        picture: profile.picture || "",
      };
      if (profile.email) {
        setTaskEmail(profile.email);
        localStorage.setItem("moodcast_email", profile.email);
      }
      setUserProfile(nextUserProfile);
      localStorage.setItem(
        "moodcast_user_profile",
        JSON.stringify(nextUserProfile),
      );
      setShowLogin(false);
      setTaskMessage("Signed in. You can manage tasks on this page.");
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
        {userProfile ? (
          <div className="user-badge">
            {userProfile.picture ? (
              <img
                className="user-avatar"
                src={userProfile.picture}
                alt={userProfile.name}
              />
            ) : (
              <div className="user-avatar-fallback">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="user-name">{userProfile.name}</span>
          </div>
        ) : (
          <button
            type="button"
            className="auth-button"
            onClick={() => setShowLogin((current) => !current)}
          >
            Sign up / Log in
          </button>
        )}
        {!userProfile && showLogin ? (
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
