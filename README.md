# FarmerAI Frontend - Live Farm Intelligence & Voice Assistant

![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-6.x-purple)
![Firebase](https://img.shields.io/badge/Firebase-Auth-orange)
![Web Speech API](https://img.shields.io/badge/Web%20Speech-STT%20%26%20TTS-green)
![Deployment](https://img.shields.io/badge/Vercel-Deployed-black)

🌐 **Live Application:** [https://farmer-ai-frontend.vercel.app/](https://farmer-ai-frontend.vercel.app/)

A modern, responsive, and accessible agricultural frontend application designed for farmers across India. Built with **React, Vite, Vanilla CSS, and Firebase Authentication**, featuring **Multilingual Voice-to-Text (STT)**, **Text-to-Speech (TTS)**, a **Live Farm Intelligence Dashboard**, and real-time syncing with the **FarmerAI Multi-Agent Backend**.

---

## 🌟 Key Features

- **🎙️ Multimodal Voice Input (Speech-to-Text)**:
  - Supports hands-free input in **Telugu (`te-IN`)**, **Hindi (`hi-IN`)**, and **English (`en-IN`)** via the native Web Speech API.
  - Continuous recording mode with real-time visual pulse feedback.
- **🔊 Text-to-Speech Output (Read Aloud)**:
  - Integrated speech synthesis reading responses aloud in the detected language.
- **🌾 Live 3-Column Farm Intelligence Dashboard**:
  - **Live Weather Widget**: Auto-geocoded local temperature, weather condition, humidity, and wind speed (powered by Open-Meteo API).
  - **Active Farm Profile**: Automatically extracts crops, land area, district location, and loan EMI from unstructured chat history.
  - **Real-Time Tailored Advisory**: Dynamic precautions based on live weather and farm profile.
  - **Collapsible Layout**: Smooth toggle between full-screen chat and 3-column dashboard mode.
- **✨ Full Insights & Memory Modal**:
  - **AI Conversation Summary**: Context summary extracted by Google Gemini.
  - **Extracted Artefacts Grid**: Structured display of farmer entities and preferences.
  - **Smart Advisory Alerts**: Tailored alerts matching current weather risks.
- **🔐 Firebase Authentication**:
  - Seamless Google Sign-In and Email/Password authentication.
- **💬 Real-Time Chat Experience**:
  - Markdown rendering with code and tabular data formatting.
  - Session isolation with persistent local storage and backend Redis sync.

---

## 📁 Project Structure

```
FarmerAI-frontend/
├── public/                     # Static assets & icons
├── src/
│   ├── components/             # Reusable UI components
│   ├── context/
│   │   └── AuthContext.jsx     # Firebase Auth provider & session hook
│   ├── pages/
│   │   ├── AuthPage.jsx        # Login & Signup screen
│   │   └── ChatPage.jsx        # Main chat workspace & intelligence dashboard
│   ├── services/
│   │   ├── api.js              # REST client for backend agents & weather APIs
│   │   └── firebase.js         # Firebase App & Auth initialization
│   ├── App.jsx                 # Route definitions & protected routes
│   ├── index.css               # Premium design system, tokens, and dark theme
│   └── main.jsx                # Application root entry point
├── .env                        # Environment variables (local)
├── index.html                  # HTML template
├── package.json                # NPM packages & scripts
├── vite.config.js              # Vite configuration
└── README.md                   # Frontend documentation
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm** or **yarn**
- Modern Web Browser (Google Chrome / Edge recommended for Web Speech STT)

### 1. Clone the Repository

```bash
git clone https://github.com/saikiran9346/FarmerAI_frontend.git
cd FarmerAI_frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables Configuration

Create a `.env` file in the root directory:

```env
# Backend API Base URL
VITE_API_URL=https://farmerai-backend.onrender.com

# Firebase Authentication Credentials
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server

```bash
npm run dev
# The application will start at http://localhost:5173
```

### 5. Build for Production

```bash
npm run build
```

---

## 🚀 Deployment (Vercel)

This frontend is configured for zero-config continuous deployment on **Vercel**:

1. Push your code to GitHub.
2. Import the repository in your Vercel Dashboard.
3. Add the required Environment Variables (`VITE_API_URL`, `VITE_FIREBASE_*`).
4. Deploy!

---

## 📄 License

This project is licensed under the MIT License.
