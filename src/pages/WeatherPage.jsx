import { useEffect, useState } from "react";
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
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize] = useState(5);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);
  const [taskError, setTaskError] = useState("");
  const [taskMessage, setTaskMessage] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);
  const hasGoogleClientId = Boolean(
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
  );

  const loadTasks = async (
    emailToLoad = taskEmail,
    { page = 1, append = false, successMessage = "Tasks loaded." } = {},
  ) => {
    if (!emailToLoad) {
      setTaskError("Enter an email before loading tasks.");
      return;
    }

    setTaskLoading(true);
    setTaskError("");
    setTaskMessage("");

    try {
      const response = await fetch(
        `/api/tasks?email=${encodeURIComponent(emailToLoad)}&page=${page}&pageSize=${taskPageSize}`,
      );
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || `Failed to load tasks (HTTP ${response.status}).`,
        );
      }

      const incomingTasks = result?.tasks ?? [];
      const pagination = result?.pagination ?? {};

      setTaskItems((current) =>
        append ? [...current, ...incomingTasks] : incomingTasks,
      );
      setTaskPage(pagination.page ?? page);
      setHasMoreTasks(Boolean(pagination.hasMore));
      setTotalTasks(pagination.total ?? incomingTasks.length);
      if (successMessage) {
        setTaskMessage(successMessage);
      }
    } catch (error) {
      setTaskError(error.message || "Could not load tasks.");
    } finally {
      setTaskLoading(false);
    }
  };

  const loadMoreTasks = async () => {
    await loadTasks(taskEmail, {
      page: taskPage + 1,
      append: true,
      successMessage: "Loaded more tasks.",
    });
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
      await loadTasks(taskEmail, {
        page: 1,
        append: false,
        successMessage: "Task added.",
      });
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

      await loadTasks(taskEmail, {
        page: 1,
        append: false,
        successMessage: "Task deleted.",
      });
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
        await loadTasks(profile.email, {
          page: 1,
          append: false,
          successMessage: "Signed in. Tasks loaded.",
        });
      }
      setUserProfile(nextUserProfile);
      localStorage.setItem(
        "moodcast_user_profile",
        JSON.stringify(nextUserProfile),
      );
      setShowLogin(false);
      if (!profile.email) {
        setTaskMessage("Signed in. You can manage tasks on this page.");
      }
    } catch (error) {
      console.error("Google login failed:", error);
      setLoginError(error.message || "Unable to sign in right now.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (!initialTaskEmail) {
      return;
    }

    loadTasks(initialTaskEmail, {
      page: 1,
      append: false,
      successMessage: "",
    });
    // Runs once on initial homepage load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              onClick={() =>
                loadTasks(taskEmail, {
                  page: 1,
                  append: false,
                  successMessage: "Tasks loaded.",
                })
              }
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
              <p>
                Showing {taskItems.length} of {totalTasks} tasks.
              </p>
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
              {hasMoreTasks ? (
                <button
                  type="button"
                  onClick={loadMoreTasks}
                  disabled={taskLoading}
                >
                  Load More
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
