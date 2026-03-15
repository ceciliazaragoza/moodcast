const WEATHER_API_BASE = "https://api.weatherapi.com/v1/forecast.json";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed. Use GET.",
      });
    }

    const key = process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY;
    const q = req.query?.q;
    const days = req.query?.days || "1";

    if (!key) {
      return res.status(500).json({
        ok: false,
        error: "WEATHER_API_KEY is not configured on the server.",
      });
    }

    if (!q) {
      return res.status(400).json({
        ok: false,
        error: "q query parameter is required.",
      });
    }

    const weatherUrl =
      `${WEATHER_API_BASE}?key=${encodeURIComponent(key)}` +
      `&q=${encodeURIComponent(q)}` +
      `&days=${encodeURIComponent(days)}`;

    const response = await fetch(weatherUrl);
    const bodyText = await response.text();

    let parsed = null;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error:
          parsed?.error?.message ||
          "Failed to fetch current weather data from WeatherAPI.",
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("api/weather failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Weather request failed.",
    });
  }
}
