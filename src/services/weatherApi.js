const CURRENT_WEATHER_URL = `http://api.weatherapi.com/v1/current.json?key=${import.meta.env.VITE_WEATHER_API_KEY}`;

export const getCurrentWeather = async (location) => {
  try {
    const locationQuery = encodeURIComponent(location);
    const currentWeatherRequest = `${CURRENT_WEATHER_URL}&q=${locationQuery}`;
    const response = await fetch(currentWeatherRequest);
    if (!response.ok) {
      throw new Error("Failed to fetch current weather data");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching current weather:", error);
    throw error;
  }
};
