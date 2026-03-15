import { useEffect, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Link } from "react-router-dom";
import { getForecast } from "../services/weatherApi";
import profileIcon from "../assets/pfp.jpg";
import Task from "../Task.jsx";

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
  const activeTaskEmail =
    userProfile?.email ||
    taskEmail ||
    (typeof window !== "undefined"
      ? localStorage.getItem("moodcast_email") || ""
      : "");
  const hasTaskIdentity = Boolean(activeTaskEmail);

  useEffect(() => {
    if (!userProfile || userProfile.email || !taskEmail) {
      return;
    }

    const repairedUserProfile = {
      ...userProfile,
      email: taskEmail,
    };
    setUserProfile(repairedUserProfile);
    localStorage.setItem(
      "moodcast_user_profile",
      JSON.stringify(repairedUserProfile),
    );
  }, [taskEmail, userProfile]);

  useEffect(() => {
    if (!userProfile?.email || taskEmail) {
      return;
    }

    setTaskEmail(userProfile.email);
    localStorage.setItem("moodcast_email", userProfile.email);
  }, [taskEmail, userProfile]);

  const loadTasks = async (
    emailToLoad = activeTaskEmail,
    { page = 1, append = false, successMessage = "Tasks loaded." } = {},
  ) => {
    if (!emailToLoad) {
      setTaskError("Sign in first to load your tasks.");
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
    await loadTasks(activeTaskEmail, {
      page: taskPage + 1,
      append: true,
      successMessage: "Loaded more tasks.",
    });
  };

  const addTask = async () => {
    if (!taskDescription) {
      setTaskError("Task description is required.");
      return;
    }

    if (!activeTaskEmail) {
      setTaskError(
        "Could not find your email in this session. Sign in again to continue.",
      );
      setShowLogin(true);
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
          email: activeTaskEmail,
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
      await loadTasks(activeTaskEmail, {
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
    if (!activeTaskEmail) {
      setTaskError("Sign in first to delete tasks.");
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
          email: activeTaskEmail,
          description,
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || `Failed to delete task (HTTP ${response.status}).`,
        );
      }

      await loadTasks(activeTaskEmail, {
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
        email: profile.email || "",
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
    <div className="container">
      <div className="topRightProfile">
        {userProfile && hasTaskIdentity ? (
          <>
            <span className="username">{userProfile.name}</span>
            <img
              src={userProfile.picture || profileIcon}
              alt={userProfile.name}
              className="topRightIcon"
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
      <main>
        <div className="left">
          <div className="leftContent">
            <h1>Tasks</h1>
            <p>
              Showing {taskItems.length} of {totalTasks} tasks
            </p>

            {taskLoading ? <p>Working...</p> : null}
            {taskMessage ? <p className="success">{taskMessage}</p> : null}
            {taskError ? <p className="error">{taskError}</p> : null}

            <div className="task-list">
              <Task
                tasks={taskItems}
                taskLoading={taskLoading}
                onDelete={deleteTask}
              />
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
          </div>
        </div>

        <div className="right">
          <div className="rightContent">
            <h2>Moodcast</h2>
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
              type="button"
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
              <h3>Add Task</h3>
              {hasTaskIdentity ? (
                <p className="helper-text">
                  Adding tasks for: {activeTaskEmail}
                </p>
              ) : (
                <p className="helper-text">
                  Sign in to add and manage tasks. If you already signed in,
                  click Sign up / Log in again to refresh your email.
                </p>
              )}
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
                    loadTasks(activeTaskEmail, {
                      page: 1,
                      append: false,
                      successMessage: "Tasks loaded.",
                    })
                  }
                  disabled={taskLoading}
                >
                  Refresh Tasks
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
