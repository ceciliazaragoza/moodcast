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
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
