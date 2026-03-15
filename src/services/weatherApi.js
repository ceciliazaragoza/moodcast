const WEATHER_API_BASE = "https://api.weatherapi.com/v1/forecast.json";

export const getForecast = async (location) => {
  try {
    if (!location) {
      throw new Error("Location is required to fetch weather.");
    }

    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_WEATHER_API_KEY is missing.");
    }

    const response = await fetch(
      `${WEATHER_API_BASE}?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(location)}&days=1`,
    );

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          data?.error ||
          `Failed to fetch current weather data (HTTP ${response.status}).`,
      );
    }

    return data;
  } catch (error) {
    console.error("Error fetching current weather:", error);
    throw error;
  }
};
