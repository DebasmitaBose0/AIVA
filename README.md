# 🤖 AIVA — Artificially Intelligent Voice Assistant 🎙️

> A full-stack, JARVIS-inspired voice assistant web application.

---

## 🏗️ Architecture

- 🔙 **Backend** — Node.js + Express server with API key authentication, CORS, and REST APIs
- 🖥️ **Frontend** — Next.js application with futuristic UI and voice interaction

---

## ✨ Features

- 🗣️ **Voice command input** using Web Speech API (speech recognition)
- 🔊 **Text-to-speech replies** with dynamic voices
- 🌍 **Bilingual greetings & interaction** — English and Hindi (featuring 1 Male & 1 Female Hindi voice)
- 🎯 **Smart voice selection** — voices grouped by language with Indian accent prioritization
- 🌦️ **Enhanced weather lookup** with OpenWeatherMap & WeatherAPI fallback
- 🏏 **Live Sports Scores** — CricketData & API-Football integration
- 📰 **Headlines Delivery** via GNews API
- ⌨️ **Dynamic Input Modes** — Switch between Voice Mode and Text/Type Mode by speaking (e.g., "enable type mode")
- 💬 **Chat-centric UI** — mic embedded in input bar, suggestion chips, timestamps, individual message copy, clear chat
- 🔒 **Secure API** via `x-api-key` header (bypassed in dev mode)
- 🎨 **Futuristic theme** — glassmorphism, neon glows, hacker-style boot loader
- 🧠 **AI Powered** — Llama 3.3 70B through Groq API
- 🎭 **Facial Mood Recognition** — Analyze your face via camera to adjust AIVA's personality (Powered by Gemini Vision)
- 🎭 **Lucide Icons** — professional icon set throughout the UI

---

## 🚀 Setup

### 🔙 Backend

1. 📂 Navigate to `backend/` directory
2. 📦 Install dependencies: `npm install`
3. ⚙️ Configure `.env`:

   ```env
   PORT=5000
   GROQ_API_KEY=your_groq_api_key_here
   OPENWEATHER_API_KEY=your_openweather_key
   WEATHER_API_KEY=your_weatherapi_key
   CRICKET_API_KEY=your_cricket_key
   SPORTS_API_KEY=your_sports_key
   NEWS_API_KEY=your_gnews_key
   ```

4. ▶️ Run: `node server.js`

### 🖥️ Frontend

1. 📂 Navigate to `frontend/` directory
2. 📦 Install dependencies: `npm install`
3. ▶️ Run: `npm run dev`
4. 🌐 Open <http://localhost:3000> in your browser

---

## 🌍 Deployment

### 🔙 Backend (Express)
1.  **Platform:** [Render](https://render.com/) or Railway.
2.  **Build Command:** `npm install`
3.  **Start Command:** `npm start`
4.  **Environment Variables:** Add all `.env` keys in the dashboard.
    - **`API_KEY`**: Set your custom AIVA security password here.

### 🖥️ Frontend (Next.js)
1.  **Platform:** [Vercel](https://vercel.com/) (Recommended).
2.  **Environment Variables:**
    - **`NEXT_PUBLIC_API_KEY`**: Set the EXACT same password you used in the Backend (`API_KEY`).
    - **`BACKEND_URL`**: The URL provided by Render (e.g., `https://your-aiva-backend.onrender.com`).

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/voice` | 🗣️ Process a voice command and get an AI response |

**Request body:** `{ "command": "string" }`
**Response:** `{ "response": "string", "action?": "string", "voiceName?": "string" }`

> 🔐 All endpoints require the `x-api-key` header. Development mode skips the check.

> 🔄 Frontend `/api/voice` is a proxy to the backend. Set `BACKEND_URL` environment variable if running the backend elsewhere.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| 🖥️ Frontend | Next.js 14, React 18, Lucide Icons |
| 🔙 Backend | Express.js, OpenAI SDK (Groq) |
| 🧠 AI Model | Llama 3.3 70B Versatile, Gemini 1.5 Flash |
| 🌐 APIs | Groq, Gemini Vision, OpenWeather, GNews |
| 🗣️ Speech | Web Speech API (Recognition + Synthesis) |
| 🔤 Fonts | Chakra Petch, Space Grotesk, Orbitron, JetBrains Mono |

---

## 💡 Philosophy

> *Voice-first interaction, intelligent and responsive behavior.*

---

*💜 Built for practice and contribution to projects by **Debasmita Bose and Babin Bid***
