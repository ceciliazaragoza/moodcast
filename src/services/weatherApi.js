const CURRENT_WEATHER_URL = `https://api.weatherapi.com/v1/forecast.json?key=${import.meta.env.VITE_WEATHER_API_KEY}&days=1`;

export const getForecast = async (location) => {
  try {
    if (!location) {
      throw new Error("Location is required to fetch weather.");
    }

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
