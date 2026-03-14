import { useState } from "react";
import { getCurrentWeather } from "./services/weatherApi";
import "./App.css";

function App() {
  const [location, setLocation] = useState("");

  return (
    <div>
      <input
        type="text"
        placeholder="Enter location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <button
        onClick={async () => {
          try {
            const weatherData = await getCurrentWeather(location);
            console.log(weatherData);
          } catch (error) {
            console.error("Error fetching weather data:", error);
          }
        }}
      >
        Get current weather
      </button>
    </div>
  );
}

export default App;
