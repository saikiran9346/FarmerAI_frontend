import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        await signup(email, password, name);
      }
      navigate("/chat");
    } catch (err) {
      const msg = err.code === "auth/user-not-found" ? "No account found with this email." :
        err.code === "auth/wrong-password" ? "Incorrect password." :
        err.code === "auth/email-already-in-use" ? "Email already in use." :
        err.code === "auth/weak-password" ? "Password should be at least 6 characters." :
        err.code === "auth/invalid-email" ? "Invalid email address." :
        "Something went wrong. Please try again.";
      setError(msg);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/chat");
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="bg-dots" />
      <div className="auth-card glass">
        <div className="auth-logo">
          <span className="logo-icon">🌱</span>
          <h1>Farmer<span>AI</span></h1>
          <p>{tab === "login" ? "Welcome back, farmer!" : "Start your journey today"}</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>
            Sign In
          </button>
          <button className={`auth-tab ${tab === "signup" ? "active" : ""}`} onClick={() => { setTab("signup"); setError(""); }}>
            Create Account
          </button>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === "signup" && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Sai Kiran"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input-field"
              placeholder={tab === "signup" ? "Min. 6 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
            {loading ? "Please wait..." : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div className="divider">or continue with</div>

        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.4-7.6 19.9-18H43.6v-6z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-4.9l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3.2-11.4-7.8l-6.5 5C9.5 39.8 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.5 5.9l6.2 5.2C40.5 36.1 44 30.5 44 24c0-1.4-.2-2.7-.4-4z"/>
          </svg>
          Sign in with Google
        </button>

        <div className="auth-footer">
          {tab === "login" ? (
            <span>Don't have an account? <a href="#" onClick={() => setTab("signup")}>Sign up free</a></span>
          ) : (
            <span>Already have an account? <a href="#" onClick={() => setTab("login")}>Sign in</a></span>
          )}
        </div>
      </div>
    </div>
  );
}
