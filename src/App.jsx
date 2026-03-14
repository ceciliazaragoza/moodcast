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

function WeatherPage() {
  const [location, setLocation] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const hasGoogleClientId = Boolean(
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
  );

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      setLoginError("");
      setIsLoggingIn(true);

      const token = credentialResponse.credential;
      if (!token) {
        throw new Error("Google did not return an ID token.");
      }

      const profile = parseGoogleCredential(token);
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
      </section>
    </main>
  );
}

function TestPage() {
  const [status, setStatus] = useState("idle");
  const [row, setRow] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const runTest = async () => {
    setStatus("loading");
    setErrorMessage("");
    setRow(null);

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
        if (response.status === 502) {
          throw new Error(
            "Backend API is unreachable (HTTP 502). Start both servers with npm run dev.",
          );
        }
        throw new Error(
          result?.error || `Failed to query Postgres (HTTP ${response.status}).`,
        );
      }

      setRow(result?.row ?? null);
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
