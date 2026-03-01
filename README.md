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
- 🌍 **Vast Multilingual Support** — Understands and speaks English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, and Urdu
- 🎯 **Smart Voice Routing** — Automatically detects the language spoken/written and seamlessly swaps out the Text-to-Speech accent to match the native region
- 🌦️ **Enhanced weather lookup** with OpenWeatherMap & WeatherAPI fallback
- 🏏 **Live Sports Scores** — CricketData & API-Football integration
- 📰 **Headlines Delivery** via GNews API
- 💻 **Native OS Control (Windows)** — Command AIVA to mute volume, lock screen, sleep PC, or empty the recycle bin
- 📧 **Smart Email Drafting** — Tell AIVA to draft an email; it generates the content and opens your mail client ready to send
- ⌨️ **Dynamic Input Modes** — Switch between Voice Mode and Text/Type Mode by speaking (e.g., "enable type mode")
- 💬 **Chat-centric UI** — mic embedded in input bar, suggestion chips, timestamps, individual message copy, clear chat
- 🔒 **Secure API** via `x-api-key` header (bypassed in dev mode)
- 🎨 **Futuristic theme** — glassmorphism, neon glows, hacker-style boot loader
- 🧠 **Dual-Engine AI** — Gemini 2.5 Flash (Primary) falling back to Llama 3.3 70B via Groq
- 🗃️ **Offline Greeting Lexicon** — Caches small-talk responses to intelligently save quota limits
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
| 🔙 Backend | Express.js, Node Fetch, Offline Lexicon Routing |
| 🧠 AI Model | Gemini 2.5 Flash (Primary) / Llama 3.3 70B (Secondary) |
| 🌐 APIs | Groq, Gemini Vision, OpenWeather, GNews |
| 🗣️ Speech | Web Speech API (Recognition + Synthesis) |
| 🔤 Fonts | Chakra Petch, Space Grotesk, Orbitron, JetBrains Mono |

---

## 💡 Philosophy

> *Voice-first interaction, intelligent and responsive behavior.*

---

*💜 Built for practice and contribution to projects by **Debasmita Bose and Babin Bid***
