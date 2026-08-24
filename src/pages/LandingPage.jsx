import { Link } from "react-router-dom";

const features = [
  { icon: "🌾", title: "Agricultural Intelligence", desc: "Get expert advice on crop diseases, soil analysis, weather forecasts, and farming best practices tailored to your region." },
  { icon: "💰", title: "Financial Planning", desc: "Calculate EMIs, explore government loan schemes, insurance options, and get personalized financial guidance for farmers." },
  { icon: "🌤️", title: "Weather & Market Data", desc: "Real-time weather forecasts and market price trends to help you make better decisions about planting and selling." },
  { icon: "🏛️", title: "Government Schemes", desc: "Stay updated on PM-Kisan, Kisan Credit Card, crop insurance subsidies, and all schemes you are eligible for." },
  { icon: "🧠", title: "Memory-Powered AI", desc: "Our AI remembers your farm details, past conversations, and preferences to give personalized recommendations every time." },
  { icon: "🔒", title: "Secure & Private", desc: "Your farm data and conversations are securely stored and accessible only to you with enterprise-grade encryption." },
];

export default function LandingPage() {
  return (
    <div>
      <div className="bg-dots" />
      <nav className="landing-nav">
        <div className="nav-logo">
          🌱 Farmer<span>AI</span>
        </div>
        <div className="nav-actions">
          <Link to="/auth">
            <button className="btn-outline">Sign In</button>
          </Link>
          <Link to="/auth">
            <button className="btn-primary">Get Started →</button>
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">🚀 AI-Powered Agricultural Assistant</div>
        <h1>
          Smarter Farming<br />
          <span className="gradient-text">Powered by AI</span>
        </h1>
        <p>
          Your intelligent farming companion. Get real-time advice on crops, weather, 
          loans, and government schemes — all in one place, in your language.
        </p>
        <div className="hero-actions">
          <Link to="/auth">
            <button className="btn-primary" style={{ padding: "14px 36px", fontSize: "16px" }}>
              Start for Free →
            </button>
          </Link>
          <a href="#features">
            <button className="btn-outline" style={{ padding: "14px 36px", fontSize: "16px" }}>
              See Features
            </button>
          </a>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-header">
          <h2>Everything a farmer needs</h2>
          <p>Powered by Google Gemini AI and designed specifically for Indian farmers</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-card">
          <h2>Ready to transform your farm? 🌱</h2>
          <p>Join thousands of farmers already using FarmerAI to grow smarter and earn more.</p>
          <Link to="/auth">
            <button className="btn-primary" style={{ padding: "16px 44px", fontSize: "17px" }}>
              Get Started Free →
            </button>
          </Link>
        </div>
      </section>

      <footer>
        <p>© 2026 FarmerAI · Built with ❤️ for Indian Farmers</p>
      </footer>
    </div>
  );
}
