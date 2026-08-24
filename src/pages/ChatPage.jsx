import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  sendChatMessage,
  getUserConversations,
  getConversationHistory,
  deleteConversation,
  getConversationSummary,
  getConversationArtefacts,
  getPersonalizedNotification,
} from "../services/api";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  { icon: "💸", text: "Calculate EMI for a 5 lakh loan at 8% interest for 5 years" },
  { icon: "🌱", text: "I have 4 acres of cotton in Warangal, Telangana. What fertilizers should I use?" },
  { icon: "🏛️", text: "Explain the key benefits and eligibility of PM-Kisan Samman Nidhi scheme" },
  { icon: "🌤️", text: "What crops should I plant in the Kharif season in Andhra Pradesh?" },
];

const agentLabels = {
  financial: { label: "Financial Agent", class: "financial" },
  agrifact: { label: "Agri Expert", class: "agrifact" },
  conversational: { label: "Assistant", class: "conversational" },
};

function genConvId() {
  return "conv_" + Date.now();
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAgent, setLastAgent] = useState(null);

  // Cache for first messages of conversations to show clean labels in sidebar
  const [convTitles, setConvTitles] = useState({});

  // Insights / Artefacts Modal States
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [modalTab, setModalTab] = useState("summary"); // 'summary' | 'artefacts' | 'alerts'
  const [summaryData, setSummaryData] = useState(null);
  const [artefactsData, setArtefactsData] = useState([]);
  const [notificationData, setNotificationData] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const userId = user?.uid || "user";
  const convsKey = `farmerai_convs_${userId}`;
  const msgsKey = (cid) => `farmerai_msgs_${userId}_${cid}`;
  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();

  // Load conversations list on mount
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(convsKey) || "[]");
    if (local.length > 0) setConversations(local);
    syncConversations(local);
  }, []);

  // Fetch titles for each conversation in sidebar
  useEffect(() => {
    conversations.forEach((cid) => {
      if (!convTitles[cid]) {
        // Try local storage first
        const localMsgs = JSON.parse(localStorage.getItem(msgsKey(cid)) || "[]");
        if (localMsgs.length > 0 && localMsgs[0].content) {
          setConvTitles((prev) => ({ ...prev, [cid]: localMsgs[0].content }));
        } else {
          // Fetch from API in background to get title
          getConversationHistory(userId, cid)
            .then((data) => {
              if (data && data.messages && data.messages.length > 0) {
                const firstMsg = data.messages[0];
                const content = firstMsg.content || firstMsg.text || "";
                if (content) {
                  setConvTitles((prev) => ({ ...prev, [cid]: content }));
                  // Sync to local storage for speed
                  const formatted = data.messages.map((m) => ({
                    role: m.role === "user" ? "user" : "bot",
                    content: m.content || m.text || "",
                    time: m.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  }));
                  localStorage.setItem(msgsKey(cid), JSON.stringify(formatted));
                }
              }
            })
            .catch(() => {});
        }
      }
    });
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const syncConversations = async (local = []) => {
    try {
      const data = await getUserConversations(userId);
      const api = Array.isArray(data) ? data : data.conversations || [];
      const merged = [...new Set([...local, ...api])];
      if (merged.length > 0) {
        setConversations(merged);
        saveConvsList(merged);
      }
    } catch (e) {}
  };

  const saveConvsList = (list) => {
    localStorage.setItem(convsKey, JSON.stringify(list));
  };

  const saveMsgs = (cid, msgs) => {
    localStorage.setItem(msgsKey(cid), JSON.stringify(msgs));
  };

  const startNewConversation = () => {
    const newId = genConvId();
    setActiveConvId(newId);
    setMessages([]);
    setLastAgent(null);
    setSummaryData(null);
    setArtefactsData([]);
    setNotificationData(null);
  };

  const loadConversation = async (convId) => {
    setActiveConvId(convId);
    setMessages([]);
    setLastAgent(null);
    setSummaryData(null);
    setArtefactsData([]);
    setNotificationData(null);

    // 1. Try local storage first for instant load
    const saved = JSON.parse(localStorage.getItem(msgsKey(convId)) || "[]");
    if (saved.length > 0) {
      setMessages(saved);
    }

    // 2. Fetch fresh history from Redis backend to sync
    try {
      setLoading(true);
      const data = await getConversationHistory(userId, convId);
      if (data && data.messages && data.messages.length > 0) {
        const formatted = data.messages.map((m) => ({
          role: m.role === "user" ? "user" : "bot",
          content: m.content || m.text || "",
          time: m.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          agent: m.agent || null,
        }));
        setMessages(formatted);
        saveMsgs(convId, formatted);

        // Update title if changed
        if (formatted[0]?.content) {
          setConvTitles((prev) => ({ ...prev, [convId]: formatted[0].content }));
        }
      }
    } catch (e) {
      console.error("Failed to sync conversation from API:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConv = async (e, convId) => {
    e.stopPropagation();
    try {
      await deleteConversation(userId, convId);
    } catch (e) {}
    localStorage.removeItem(msgsKey(convId));
    const updated = conversations.filter((c) => c !== convId);
    setConversations(updated);
    saveConvsList(updated);
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([]);
    }
  };

  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const convId = activeConvId || genConvId();
    let updatedConvs = conversations;

    if (!activeConvId) {
      setActiveConvId(convId);
      updatedConvs = [convId, ...conversations.filter((c) => c !== convId)];
      setConversations(updatedConvs);
      saveConvsList(updatedConvs);
      setConvTitles((prev) => ({ ...prev, [convId]: query }));
    } else if (!conversations.includes(convId)) {
      updatedConvs = [convId, ...conversations];
      setConversations(updatedConvs);
      saveConvsList(updatedConvs);
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = {
      role: "user",
      content: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const data = await sendChatMessage(query, userId, convId);
      const botMsg = {
        role: "bot",
        content: data.response || "I could not process your request. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        agent: data.agent_used,
      };
      const finalMsgs = [...newMsgs, botMsg];
      setMessages(finalMsgs);
      saveMsgs(convId, finalMsgs);
      if (data.agent_used) setLastAgent(data.agent_used);
    } catch (e) {
      const errMsg = {
        role: "bot",
        content: "Sorry, I could not connect to the server. Please check your connection and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMsgs = [...newMsgs, errMsg];
      setMessages(finalMsgs);
      saveMsgs(convId, finalMsgs);
    }
    setLoading(false);
  };

  // Trigger Insights / Summary / Artefacts Modal
  const handleOpenInsights = async () => {
    setShowInsightsModal(true);
    if (messages.length === 0) return;

    setInsightsLoading(true);
    try {
      // 1. Fetch summary
      const sumRes = await getConversationSummary(messages);
      if (sumRes.success) setSummaryData(sumRes.summary);

      // 2. Fetch artefacts
      const artRes = await getConversationArtefacts(messages);
      if (artRes.success) {
        setArtefactsData(artRes.artefacts || []);

        // 3. Generate sample personalized notification
        if (artRes.artefacts && artRes.artefacts.length > 0) {
          const sampleArticle = "Heavy rainfall and strong winds are predicted for central agricultural regions this week. Farmers are advised to secure crops and arrange adequate field drainage.";
          const notifRes = await getPersonalizedNotification(userId, activeConvId || "default", artRes.artefacts, sampleArticle);
          if (notifRes.success) {
            setNotificationData(notifRes.notification_message);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
    }
    setInsightsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const agentInfo = lastAgent && agentLabels[lastAgent];

  const convLabel = (convId) => {
    const title = convTitles[convId];
    if (title) {
      return title.slice(0, 32) + (title.length > 32 ? "..." : "");
    }
    const ts = convId.replace("conv_", "");
    const date = new Date(Number(ts));
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    return convId;
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            🌱 Farmer<span>AI</span>
          </div>
        </div>
        <div style={{ padding: "0 16px" }}>
          <button className="new-chat-btn" onClick={startNewConversation}>
            ✏️ New Conversation
          </button>
        </div>
        <div className="sidebar-section">
          {conversations.length > 0 ? (
            <>
              <div className="sidebar-section-label">Recent Chats</div>
              {conversations.map((convId) => (
                <div
                  key={convId}
                  className={`conv-item ${activeConvId === convId ? "active" : ""}`}
                  onClick={() => loadConversation(convId)}
                >
                  <span className="conv-item-text">💬 {convLabel(convId)}</span>
                  <button className="conv-delete" onClick={(e) => handleDeleteConv(e, convId)}>
                    🗑️
                  </button>
                </div>
              ))}
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "16px 4px", textAlign: "center" }}>
              No conversations yet.<br />Start chatting!
            </p>
          )}
        </div>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.photoURL ? <img src={user.photoURL} alt="avatar" /> : userInitial}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.displayName || "Farmer"}</div>
              <div className="user-email">{user?.email}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Sign out">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="chat-area">
        <div className="chat-header">
          <div>
            <h2>FarmerAI Assistant</h2>
            <p>Powered by Google Gemini · Agricultural & Financial Intelligence</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {agentInfo && <span className={`agent-badge ${agentInfo.class}`}>{agentInfo.label}</span>}
            {messages.length > 0 && (
              <button className="header-action-btn" onClick={handleOpenInsights} title="View AI summary and extracted farm artefacts">
                ✨ Farm Insights & Summary
              </button>
            )}
          </div>
        </div>

        {messages.length === 0 && !loading ? (
          <div className="welcome-screen">
            <div>
              <h2>Hello, {user?.displayName?.split(" ")[0] || "Farmer"}! 👋</h2>
              <p>What would you like to know today?</p>
            </div>
            <div className="suggestion-grid">
              {SUGGESTIONS.map((s, i) => (
                <div className="suggestion-card" key={i} onClick={() => handleSend(s.text)}>
                  <span className="icon">{s.icon}</span>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="msg-avatar">{msg.role === "user" ? userInitial : "🌱"}</div>
                <div className="msg-content">
                  <div className="msg-bubble">
                    {msg.role === "bot" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                  </div>
                  <div className="msg-meta">
                    <span className="msg-time">{msg.time}</span>
                    {msg.agent && agentLabels[msg.agent] && (
                      <span className={`agent-badge ${agentLabels[msg.agent].class}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                        {agentLabels[msg.agent].label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="typing-indicator">
                <div className="msg-avatar" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  🌱
                </div>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Ask about crops, loans, weather, schemes..."
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim() || loading}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </main>

      {/* Insights & Summary Modal */}
      {showInsightsModal && (
        <div className="modal-overlay" onClick={() => setShowInsightsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✨ AI Farm Insights & Memory</h3>
              <button className="modal-close" onClick={() => setShowInsightsModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-tabs">
                <button
                  className={`modal-tab-btn ${modalTab === "summary" ? "active" : ""}`}
                  onClick={() => setModalTab("summary")}
                >
                  📝 Conversation Summary
                </button>
                <button
                  className={`modal-tab-btn ${modalTab === "artefacts" ? "active" : ""}`}
                  onClick={() => setModalTab("artefacts")}
                >
                  🏷️ Extracted Artefacts ({artefactsData.length})
                </button>
                <button
                  className={`modal-tab-btn ${modalTab === "alerts" ? "active" : ""}`}
                  onClick={() => setModalTab("alerts")}
                >
                  🔔 Smart Alerts
                </button>
              </div>

              {insightsLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div className="spinner" />
                  <p style={{ marginTop: "16px", color: "var(--text-muted)", fontSize: "14px" }}>
                    Analyzing conversation with Google Gemini...
                  </p>
                </div>
              ) : (
                <>
                  {modalTab === "summary" && (
                    <div>
                      <h4 style={{ fontSize: "14px", color: "var(--green-light)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        AI Generated Memory Summary
                      </h4>
                      {summaryData ? (
                        <p style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", lineHeight: "1.7", fontSize: "14px" }}>
                          {summaryData}
                        </p>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                          No summary generated yet. Have a longer conversation to generate summary!
                        </p>
                      )}
                    </div>
                  )}

                  {modalTab === "artefacts" && (
                    <div>
                      <h4 style={{ fontSize: "14px", color: "var(--green-light)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Extracted Farmer Entities & Preferences
                      </h4>
                      {artefactsData.length > 0 ? (
                        <div className="artefact-grid">
                          {artefactsData.map((art, idx) => (
                            <div className="artefact-card" key={idx}>
                              <div className="artefact-name">{art.artefact_name?.replace(/_/g, " ")}</div>
                              <div className="artefact-val">{art.value}</div>
                              {art.description && <div className="artefact-desc">{art.description}</div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                          No artefacts detected in this chat yet. Try mentioning crops, acres, loan amount, or district!
                        </p>
                      )}
                    </div>
                  )}

                  {modalTab === "alerts" && (
                    <div>
                      <h4 style={{ fontSize: "14px", color: "var(--green-light)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Personalized Smart Advisory
                      </h4>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px" }}>
                        Generated dynamically by pairing your farm profile artefacts with external weather/market news.
                      </p>
                      {notificationData ? (
                        <div className="notification-box">
                          <h4>⚡ Real-time Advisory</h4>
                          <p>{notificationData}</p>
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                          Provide farm details (crops, location) in chat to generate tailored advisories!
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
