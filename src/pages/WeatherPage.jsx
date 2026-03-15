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
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [currentLocationLabel, setCurrentLocationLabel] = useState("");
  const [geoStatusMessage, setGeoStatusMessage] = useState(
    "Detecting your current location...",
  );
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

  const toggleTask = async (task, nextCompleted) => {
    if (!activeTaskEmail) {
      setTaskError("Sign in first to update tasks.");
      return;
    }

    const previousCompleted = Boolean(task.completed);

    setTaskItems((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, completed: Boolean(nextCompleted) } : item,
      ),
    );

    setTaskLoading(true);
    setTaskError("");
    setTaskMessage("");

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: activeTaskEmail,
          id: task.id,
          completed: Boolean(nextCompleted),
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || `Failed to update task (HTTP ${response.status}).`,
        );
      }

      setTaskMessage("Task updated.");
    } catch (error) {
      setTaskItems((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, completed: previousCompleted } : item,
        ),
      );
      setTaskError(error.message || "Could not update task.");
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

  const getCityOrPostalFromCoords = async (latitude, longitude) => {
    const reverseGeocodeUrl =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(latitude)}` +
      `&lon=${encodeURIComponent(longitude)}`;

    const response = await fetch(reverseGeocodeUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    const result = await readApiResponse(response);
    if (!response.ok) {
      throw new Error(
        result?.error || "Could not resolve your city from current location.",
      );
    }

    const address = result?.address || {};
    const cityName =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county;
    const postalCode = address.postcode;

    if (cityName) {
      return cityName;
    }

    if (postalCode) {
      return postalCode;
    }

    throw new Error(
      "Could not determine a city or zip code from your current location.",
    );
  };

  const postMessageToExtension = ({ type, payload }) => {
    if (typeof window === "undefined") {
      return;
    }

    window.postMessage(
      {
        source: "moodcast-web-app",
        target: "moodcast-chrome-extension",
        type,
        payload,
      },
      window.location.origin,
    );
  };

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== window) {
        return;
      }

      const message = event.data;
      const isWeatherRequest =
        message?.target === "moodcast-web-app" &&
        (message?.type === "REQUEST_WEATHER" ||
          message?.type === "MOODCAST_WEATHER_REQUEST");

      if (!isWeatherRequest) {
        return;
      }

      postMessageToExtension({
        type: "WEATHER_RESPONSE",
        payload: {
          requestId: message?.requestId || null,
          current: {
            tempF: weatherData?.current?.temp_f ?? null,
            condition: weatherData?.current?.condition?.text || "",
          },
          status: weatherLoading
            ? "loading"
            : weatherError
              ? "error"
              : weatherData
                ? "ready"
                : "empty",
          error: weatherError || "",
          fetchedAt: new Date().toISOString(),
        },
      });
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [weatherData, weatherError, weatherLoading]);

  const fetchWeatherForCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setWeatherError("Geolocation is not supported by your browser.");
      setGeoStatusMessage("Geolocation is not supported by your browser.");
      return;
    }

    setWeatherLoading(true);
    setWeatherError("");
    setGeoStatusMessage("Detecting your current location...");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const coordinatesQuery = `${position.coords.latitude},${position.coords.longitude}`;
      let locationQuery = "";

      try {
        locationQuery = await getCityOrPostalFromCoords(
          position.coords.latitude,
          position.coords.longitude,
        );
      } catch {
        // Fallback keeps weather available even when reverse geocoding is unavailable.
        locationQuery = coordinatesQuery;
      }

      const forecast = await getForecast(locationQuery);
      setWeatherData(forecast);
      setCurrentLocationLabel(
        `${forecast?.location?.name || "Unknown"}, ${forecast?.location?.region || ""}`.replace(
          /,\s*$/,
          "",
        ) || "Location detected",
      );
      setGeoStatusMessage("Using your current location.");
      postMessageToExtension({
        type: "WEATHER_UPDATE",
        payload: {
          location: {
            name: forecast?.location?.name || "Unknown",
            region: forecast?.location?.region || "",
            country: forecast?.location?.country || "",
          },
          current: {
            tempF: forecast?.current?.temp_f ?? null,
            condition: forecast?.current?.condition?.text || "",
          },
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      setWeatherData(null);
      setCurrentLocationLabel("");
      setWeatherError(
        error?.message || "Could not detect your location right now.",
      );
      setGeoStatusMessage("Location detection failed.");
      postMessageToExtension({
        type: "WEATHER_ERROR",
        payload: {
          message: error?.message || "Could not detect your location right now.",
          fetchedAt: new Date().toISOString(),
        },
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherForCurrentLocation();
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
                onToggle={toggleTask}
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

            <p className="helper-text">{geoStatusMessage}</p>
            <p className="helper-text">
              Current location: {currentLocationLabel || "Not available yet"}
            </p>

            {weatherLoading ? <p>Loading weather...</p> : null}
            {weatherError ? <p className="error">{weatherError}</p> : null}
            {weatherData ? (
              <div className="weather-card">
                <p>
                  {weatherData.location?.name}, {weatherData.location?.region}
                </p>
                <p>
                  {weatherData.current?.temp_f} F |{" "}
                  {weatherData.current?.condition?.text}
                </p>
              </div>
            ) : null}

            <button type="button" onClick={fetchWeatherForCurrentLocation}>
              Refresh current location weather
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
