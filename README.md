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
- 🌍 **Multilingual greetings** — Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi & English
- 🎯 **Smart voice selection** — voices grouped by language with Indian accent prioritization
- 🌦️ **Enhanced weather lookup** with OpenWeatherMap & WeatherAPI fallback
- 🏏 **Live Sports Scores** — CricketData & API-Football integration
- 📰 **Headlines Delivery** via GNews API
- ⌨️ **Dynamic Input Modes** — Switch between Voice Mode and Text/Type Mode by speaking (e.g., "enable type mode")
- 💬 **Chat-centric UI** — mic embedded in input bar, suggestion chips, timestamps, copy/clear
- 🔒 **Secure API** via `x-api-key` header (bypassed in dev mode)
- 🎨 **Futuristic theme** — glassmorphism, neon glows, hacker-style boot loader
- 🧠 **Dual AI Engine** — Gemini 2.5 Flash (Primary) + Llama 3.3 70B (Fallback)
- 🎭 **Lucide Icons** — professional icon set throughout the UI

---

## 🚀 Setup

### 🔙 Backend

1. 📂 Navigate to `backend/` directory
2. 📦 Install dependencies: `npm install`
3. ⚙️ Configure `.env`:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_gemini_key
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
| 🧠 AI Model | Gemini 2.5 Flash & Llama 3.3 70B |
| 🌐 APIs | Gemini, Groq, wttr.in, Open-Meteo, DuckDuckGo, Wikipedia |
| 🗣️ Speech | Web Speech API (Recognition + Synthesis) |
| 🔤 Fonts | Chakra Petch, Space Grotesk, Orbitron, JetBrains Mono |

---

## 💡 Philosophy

> *Voice-first interaction, intelligent and responsive behavior.*

---

## 📜 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Developed with ❤️ for the future of Voice AI</b><br>
  <i>AIVA is a continuous exploration into building responsive, smart, and accessible voice interfaces.</i>
</p>

<br>

<div align="center">

### 👩‍💻 Debasmita Bose
[![GitHub](https://img.shields.io/badge/GitHub-Profile-181717?style=flat&logo=github)](https://github.com/DebasmitaBose0)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/debasmita-bose2023/)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=flat&logo=gmail)](mailto:dbose272@gmail.com)

### 👨‍💻 Babin Bid
[![GitHub](https://img.shields.io/badge/GitHub-Profile-181717?style=flat&logo=github)](https://github.com/KGFCH2)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/babinbid123/)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=flat&logo=gmail)](mailto:babinbid05@gmail.com)

</div>
