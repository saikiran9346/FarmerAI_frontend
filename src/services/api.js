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

export const getHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export default api;
