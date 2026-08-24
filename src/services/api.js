import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://farmerai-backend-gwtt.onrender.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

export const sendChatMessage = async (query, userId, conversationId) => {
  const response = await api.post("/chat", {
    query,
    user_id: userId,
    conversation_id: conversationId,
  });
  return response.data;
};

export const getUserConversations = async (userId) => {
  const response = await api.get(`/conversations/${userId}`);
  return response.data;
};

export const getConversationHistory = async (userId, conversationId) => {
  const response = await api.get(`/conversations/${userId}/${conversationId}`);
  return response.data;
};

export const deleteConversation = async (userId, conversationId) => {
  const response = await api.delete(`/conversations/${userId}/${conversationId}`);
  return response.data;
};

export const getConversationSummary = async (messages, previousSummary = null) => {
  const formattedMessages = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
  const response = await api.post("/conversation/summary", {
    messages: formattedMessages,
    previous_summary: previousSummary,
  });
  return response.data;
};

export const getConversationArtefacts = async (messages) => {
  const formattedMessages = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
  const response = await api.post("/conversation/artefacts", {
    messages: formattedMessages,
  });
  return response.data;
};

export const getPersonalizedNotification = async (userId, conversationId, artefacts, eventArticle) => {
  const response = await api.post("/notification", {
    user_id: userId,
    conversation_id: conversationId,
    artefacts,
    event_article: eventArticle,
  });
  return response.data;
};

// Real-time Free Weather & Geocoding Service (Open-Meteo)
export const fetchCityWeather = async (cityName) => {
  try {
    const geoRes = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    );
    if (!geoRes.data?.results || geoRes.data.results.length === 0) {
      return null;
    }
    const { latitude, longitude, name, admin1, country } = geoRes.data.results[0];

    const weatherRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    );

    const current = weatherRes.data?.current;
    if (!current) return null;

    // Interpret WMO weather code
    const code = current.weather_code;
    let condition = "Clear Skies";
    let icon = "☀️";
    if (code === 1 || code === 2 || code === 3) { condition = "Partly Cloudy"; icon = "⛅"; }
    else if (code >= 45 && code <= 48) { condition = "Foggy"; icon = "🌫️"; }
    else if (code >= 51 && code <= 67) { condition = "Rain / Drizzle"; icon = "🌧️"; }
    else if (code >= 80 && code <= 82) { condition = "Heavy Showers"; icon = "⛈️"; }
    else if (code >= 95) { condition = "Thunderstorm"; icon = "⚡"; }

    return {
      cityName: name,
      state: admin1 || "",
      country: country || "",
      temperature: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      condition,
      icon,
    };
  } catch (e) {
    console.error("Error fetching weather:", e);
    return null;
  }
};

export const getHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export default api;
