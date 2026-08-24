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
  fetchCityWeather,
} from "../services/api";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  { icon: "💸", text: "Calculate EMI for a 5 lakh loan at 8% interest for 5 years" },
  { icon: "🌱", text: "I have 6 acres of cotton in Warangal, Telangana. What fertilizers should I use?" },
  { icon: "🏛️", text: "Explain the key benefits and eligibility of PM-Kisan Samman Nidhi scheme" },
  { icon: "🌤️", text: "What crops should I plant in the Kharif season in Kurnool?" },
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
  const [botTyping, setBotTyping] = useState(false);
  const [lastAgent, setLastAgent] = useState(null);

  // Cache for first messages of conversations to show clean labels in sidebar
  const [convTitles, setConvTitles] = useState({});

  // Right-side Live Intelligence Dashboard States
  const [panelOpen, setPanelOpen] = useState(true);
  const [detectedLocation, setDetectedLocation] = useState("Warangal");
  const [weatherData, setWeatherData] = useState(null);
  const [farmProfile, setFarmProfile] = useState({
    crops: null,
    landSize: null,
    district: null,
    loanAmount: null,
    loanEmi: null,
  });
  const [liveAdvisory, setLiveAdvisory] = useState(null);
  const [summaryText, setSummaryText] = useState(null);
  const [rawArtefacts, setRawArtefacts] = useState([]);
  const [intelLoading, setIntelLoading] = useState(false);

  // Full Details Modal
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [modalTab, setModalTab] = useState("summary");

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
    loadWeatherForCity(detectedLocation);
  }, []);

  // Sync conversation titles from messages
  useEffect(() => {
    conversations.forEach((cid) => {
      if (!convTitles[cid]) {
        const localMsgs = JSON.parse(localStorage.getItem(msgsKey(cid)) || "[]");
        if (localMsgs.length > 0 && localMsgs[0].content) {
          setConvTitles((prev) => ({ ...prev, [cid]: localMsgs[0].content }));
        } else {
          getConversationHistory(userId, cid)
            .then((data) => {
              if (data && data.messages && data.messages.length > 0) {
                const firstMsg = data.messages[0];
                const content = firstMsg.content || firstMsg.text || "";
                if (content) {
                  setConvTitles((prev) => ({ ...prev, [cid]: content }));
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
  }, [messages, botTyping]);

  // Load weather for city
  const loadWeatherForCity = async (city) => {
    const data = await fetchCityWeather(city);
    if (data) setWeatherData(data);
  };

  // Automatically extract farm intelligence when messages change
  const analyzeFarmContext = async (msgsList) => {
    if (!msgsList || msgsList.length === 0) return;
    setIntelLoading(true);

    try {
      // 1. Extract Artefacts
      const artRes = await getConversationArtefacts(msgsList);
      if (artRes.success && artRes.artefacts) {
        const arts = artRes.artefacts;
        setRawArtefacts(arts);

        let crop = null;
        let land = null;
        let loc = null;
        let loan = null;
        let emi = null;

        arts.forEach((a) => {
          const name = (a.artefact_name || "").toLowerCase();
          const val = a.value;
          if (name.includes("crop")) crop = val;
          else if (name.includes("land") || name.includes("size") || name.includes("acre")) land = val;
          else if (name.includes("district") || name.includes("location") || name.includes("city")) loc = val;
          else if (name.includes("loan") && !name.includes("emi")) loan = val;
          else if (name.includes("emi")) emi = val;
        });

        setFarmProfile({
          crops: crop || farmProfile.crops,
          landSize: land || farmProfile.landSize,
          district: loc || farmProfile.district,
          loanAmount: loan || farmProfile.loanAmount,
          loanEmi: emi || farmProfile.loanEmi,
        });

        // If location changed, update weather!
        if (loc && loc !== detectedLocation) {
          setDetectedLocation(loc);
          loadWeatherForCity(loc);
        }

        // 2. Fetch personalized advisory
        const sampleNews = `Weather forecast for ${loc || detectedLocation}: Moderate rain and humidity expected. Ensure proper soil drainage and inspect crops for pest attacks.`;
        const notifRes = await getPersonalizedNotification(userId, activeConvId || "default", arts, sampleNews);
        if (notifRes.success) {
          setLiveAdvisory(notifRes.notification_message);
        }
      }

      // 3. Update Conversation Summary in background
      if (msgsList.length >= 2) {
        const sumRes = await getConversationSummary(msgsList);
        if (sumRes.success) {
          setSummaryText(sumRes.summary);
        }
      }
    } catch (e) {
      console.error("Error analyzing farm context:", e);
    }
    setIntelLoading(false);
  };

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
    setBotTyping(false);
    setFarmProfile({ crops: null, landSize: null, district: null, loanAmount: null, loanEmi: null });
    setRawArtefacts([]);
    setLiveAdvisory(null);
    setSummaryText(null);
  };

  const loadConversation = async (convId) => {
    setActiveConvId(convId);
    setMessages([]);
    setLastAgent(null);
    setBotTyping(false);

    // Reset profile for the selected conversation
    setFarmProfile({ crops: null, landSize: null, district: null, loanAmount: null, loanEmi: null });
    setRawArtefacts([]);
    setLiveAdvisory(null);
    setSummaryText(null);

    // 1. Instant load from local storage
    const saved = JSON.parse(localStorage.getItem(msgsKey(convId)) || "[]");
    if (saved.length > 0) {
      setMessages(saved);
      analyzeFarmContext(saved);
    }

    // 2. Fetch fresh history from Redis backend in background (silent sync)
    try {
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
        if (formatted[0]?.content) {
          setConvTitles((prev) => ({ ...prev, [convId]: formatted[0].content }));
        }
        analyzeFarmContext(formatted);
      }
    } catch (e) {
      console.error("Failed to sync conversation:", e);
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
    if (!query || botTyping) return;

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
    setBotTyping(true);

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

      // Trigger automatic background analysis
      analyzeFarmContext(finalMsgs);
    } catch (e) {
      const errMsg = {
        role: "bot",
        content: "Sorry, I could not connect to the server. Please check your connection and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMsgs = [...newMsgs, errMsg];
      setMessages(finalMsgs);
      saveMsgs(convId, finalMsgs);
    } finally {
      setBotTyping(false);
    }
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
      return title.slice(0, 30) + (title.length > 30 ? "..." : "");
    }
    const ts = convId.replace("conv_", "");
    const date = new Date(Number(ts));
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    return convId;
  };

  const hasFarmDetails = farmProfile.crops || farmProfile.district || farmProfile.landSize || farmProfile.loanAmount;

  return (
    <div className="app-layout">
      {/* 1. Left Sidebar */}
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

      {/* 2. Center Chat Stream Area */}
      <main className="chat-area">
        <div className="chat-header">
          <div>
            <h2>FarmerAI Assistant</h2>
            <p>Powered by Google Gemini · Multimodal Agricultural & Financial Intelligence</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {agentInfo && <span className={`agent-badge ${agentInfo.class}`}>{agentInfo.label}</span>}
            <button
              className="panel-toggle-btn"
              onClick={() => setShowInsightsModal(true)}
              title="View full modal with raw Artefacts and Summary tabs"
            >
              ✨ Full Insights
            </button>
            <button
              className="panel-toggle-btn"
              onClick={() => setPanelOpen(!panelOpen)}
              title="Toggle Live Farm Intelligence Dashboard"
            >
              {panelOpen ? "📊 Hide Dashboard" : "📊 Show Dashboard"}
            </button>
          </div>
        </div>

        {messages.length === 0 && !botTyping ? (
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
            {botTyping && (
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
              disabled={botTyping}
            />
            <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim() || botTyping}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </main>

      {/* 3. Right-Hand Live Intelligence Dashboard */}
      <aside className={`intelligence-panel ${panelOpen ? "" : "collapsed"}`}>
        <div className="intel-header">
          <h3>🌾 Farm Intelligence</h3>
          <div className="live-badge">
            <span className="dot" /> {intelLoading ? "Syncing..." : "Live Active"}
          </div>
        </div>

        {/* 3A. Real-Time Weather Widget */}
        <div className="weather-card-main">
          <div className="weather-header-row">
            <div className="weather-city">📍 {weatherData ? weatherData.cityName : detectedLocation}</div>
            <div className="weather-cond-badge">
              <span>{weatherData?.icon || "⛅"}</span> {weatherData?.condition || "Loading..."}
            </div>
          </div>
          <div className="weather-temp-row">
            <div className="weather-temp-val">{weatherData ? `${weatherData.temperature}°C` : "--°C"}</div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {weatherData?.state ? `${weatherData.state}, India` : "India"}
            </span>
          </div>
          <div className="weather-metrics-grid">
            <div className="weather-metric-item">
              💧 Humidity: <strong>{weatherData ? `${weatherData.humidity}%` : "--"}</strong>
            </div>
            <div className="weather-metric-item">
              💨 Wind: <strong>{weatherData ? `${weatherData.windSpeed} km/h` : "--"}</strong>
            </div>
          </div>
        </div>

        {/* 3B. Extracted Farm Profile Card */}
        <div className="intel-card">
          <div className="intel-card-title">
            <span>🌱 Active Farm Profile</span>
            {hasFarmDetails && <span style={{ color: "var(--green)", fontSize: "11px" }}>● Extracted</span>}
          </div>
          {hasFarmDetails ? (
            <div className="profile-badges-grid">
              {farmProfile.crops && (
                <div className="profile-badge-item">
                  <div className="profile-badge-label">🌾 Crops</div>
                  <div className="profile-badge-val" title={farmProfile.crops}>{farmProfile.crops}</div>
                </div>
              )}
              {farmProfile.landSize && (
                <div className="profile-badge-item">
                  <div className="profile-badge-label">📐 Land Area</div>
                  <div className="profile-badge-val">{farmProfile.landSize}</div>
                </div>
              )}
              {farmProfile.district && (
                <div className="profile-badge-item">
                  <div className="profile-badge-label">📍 District</div>
                  <div className="profile-badge-val">{farmProfile.district}</div>
                </div>
              )}
              {farmProfile.loanAmount && (
                <div className="profile-badge-item">
                  <div className="profile-badge-label">💰 Loan Inquired</div>
                  <div className="profile-badge-val">{farmProfile.loanAmount}</div>
                </div>
              )}
              {farmProfile.loanEmi && (
                <div className="profile-badge-item" style={{ gridColumn: "span 2" }}>
                  <div className="profile-badge-label">💳 Calculated Monthly EMI</div>
                  <div className="profile-badge-val" style={{ color: "var(--green-light)" }}>{farmProfile.loanEmi}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="profile-empty-hint">
              Mention your crops, land size, district or loan in chat to auto-generate your farm profile!
            </div>
          )}
        </div>

        {/* 3C. Live Smart Advisory */}
        <div className="intel-card">
          <div className="intel-card-title">
            <span>⚡ Real-Time Advisory</span>
          </div>
          {liveAdvisory ? (
            <div className="live-advisory-box">
              <div className="advisory-tag">🔔 Tailored Precaution</div>
              <div className="advisory-text">{liveAdvisory}</div>
            </div>
          ) : (
            <div className="profile-empty-hint">
              Advisories update automatically based on your farm conditions and local weather.
            </div>
          )}
        </div>

        {/* 3D. Conversation Memory Summary */}
        {summaryText && (
          <div className="intel-card">
            <div className="intel-card-title">
              <span>📝 Session Summary</span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.6" }}>
              {summaryText}
            </p>
          </div>
        )}
      </aside>

      {/* 4. Full Insights & Summary Modal */}
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
                  🏷️ Extracted Artefacts ({rawArtefacts.length})
                </button>
                <button
                  className={`modal-tab-btn ${modalTab === "alerts" ? "active" : ""}`}
                  onClick={() => setModalTab("alerts")}
                >
                  🔔 Smart Alerts
                </button>
              </div>

              {modalTab === "summary" && (
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--green-light)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    AI Generated Memory Summary
                  </h4>
                  {summaryText ? (
                    <p style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", lineHeight: "1.7", fontSize: "14px" }}>
                      {summaryText}
                    </p>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                      No summary generated yet. Chat a bit more to generate a detailed session summary!
                    </p>
                  )}
                </div>
              )}

              {modalTab === "artefacts" && (
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--green-light)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Extracted Farmer Entities & Preferences
                  </h4>
                  {rawArtefacts.length > 0 ? (
                    <div className="artefact-grid">
                      {rawArtefacts.map((art, idx) => (
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
                  {liveAdvisory ? (
                    <div className="notification-box">
                      <h4>⚡ Real-time Advisory</h4>
                      <p>{liveAdvisory}</p>
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                      Provide farm details (crops, location) in chat to generate tailored advisories!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
