export const getForecast = async (location) => {
  try {
    if (!location) {
      throw new Error("Location is required to fetch weather.");
    }

    const response = await fetch(
      `/api/weather?q=${encodeURIComponent(location)}&days=1`,
    );

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
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
