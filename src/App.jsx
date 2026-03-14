import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { getForecast } from "./services/weatherApi";
import "./App.css";

function WeatherPage() {
  const [location, setLocation] = useState("");

  return (
    <main className="page">
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
        <Link className="link" to="/login">
          Go to login
        </Link>
      </section>
    </main>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const hasGoogleClientId = Boolean(
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
  );

  return (
    <main className="page">
      <section className="card">
        <h1>Login</h1>
        <p>Sign in with Google to continue.</p>
        {hasGoogleClientId ? (
          <GoogleLogin
            onSuccess={() => navigate("/profile")}
            onError={() => {
              console.error("Google login failed.");
            }}
          />
        ) : (
          <p className="error">Missing VITE_GOOGLE_OAUTH_CLIENT_ID in .env</p>
        )}
      </section>
    </main>
  );
}

function ProfilePage() {
  return (
    <main className="page">
      <section className="card">
        <h1>Profile</h1>
        <p>This is a placeholder profile page.</p>
        <Link className="link" to="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<WeatherPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
