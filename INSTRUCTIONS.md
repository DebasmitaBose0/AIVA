# 🤖 AIVA — User Guide & Internal Architecture

> Welcome to the internal documentation and user guide for **AIVA** *(Artificially Intelligent Voice Assistant)*. Created by **Debasmita Bose** and **Babin Bid**.

---

## 💡 Project Idea

AIVA is a full-stack, JARVIS-inspired web-based voice assistant. It delivers an interactive, voice-first experience with a futuristic UI *(glassmorphism, neon glows, hacker-style boot sequence)*.

🧠 The assistant handles:
- 💬 General conversations & conversational AI
- 🌍 Complete fluency in **English** and **Hindi** (featuring distinct Male & Female Hindi voices)
- ⏰ Current time & date
- 🌦️ Weather information *(OpenWeatherMap + WeatherAPI fallback)*
- 🏏 **Live Sports Scores** *(CricketData + API-Football)* — real-time, ball-by-ball
- 📰 Live News & Headlines *(GNews API)*
- 🌐 **Real-Time Web Search** *(DuckDuckGo HTML scraping)* — enables answering about any current event
- 🤖 Conversational AI via **Llama 3.3 70B** (Groq) with internet-augmented responses
- ⌨️ **Text/Type Mode** — switch between voice and keyboard input

---

## 🔑 API Keys & Their Purpose

AIVA uses multiple APIs working together. Each serves a specific role:

### 🧠 Core AI

| Key | Service | Purpose |
|-----|---------|---------|
| `GROQ_API_KEY` | [Groq Cloud](https://console.groq.com) | Powers AIVA's conversational AI brain (Llama 3.3 70B). **Required** — without this, the assistant cannot think or respond. |

### 🌦️ Weather APIs (Primary + Fallback)

| Key | Service | Purpose |
|-----|---------|---------|
| `OPENWEATHER_API_KEY` | [OpenWeatherMap](https://openweathermap.org/api) | **Primary** weather data source. When you ask "What's the weather in Kolkata?", this is checked first. |
| `WEATHER_API_KEY` | [WeatherAPI.com](https://www.weatherapi.com/) | **Fallback** — if OpenWeatherMap is down or rate-limited, this kicks in automatically. |

### 🏏 Live Sports APIs (Real-Time Scores)

| Key | Service | Purpose |
|-----|---------|---------|
| `CRICKET_API_KEY` | [CricketData.org](https://cricketdata.org/) | Fetches **live, real-time cricket match scores** — team names, current status, ball-by-ball updates. Triggered when you ask about cricket + score/match/live. |
| `SPORTS_API_KEY` | [API-Football](https://dashboard.api-football.com/) | Fetches **live football/soccer match scores** — teams, goals, match status. Triggered when you ask about football + score/match. |

> **How do Sports APIs work with Web Search?**
> - When you ask *"What's the live cricket score?"* → AIVA checks the **Cricket API first** for real-time structured data (instant, accurate scores).
> - When you ask *"What happened in the England vs NZ match in the 2026 World Cup?"* → No live match is running, so AIVA uses **Web Search + AI** to find and summarize the result from the internet.
> - **Sports APIs = live scores happening RIGHT NOW.** **Web Search = past results, upcoming info, analysis, and any other query.**

### 📰 News API

| Key | Service | Purpose |
|-----|---------|---------|
| `NEWS_API_KEY` | [GNews.io](https://gnews.io/) | Fetches the latest news headlines when you ask for news. Returns top 5 headlines with titles. |

### 🌐 Web Search (No API Key Needed)

| Service | Purpose |
|---------|---------|
| DuckDuckGo HTML Scraping | **No API key required.** AIVA automatically scrapes DuckDuckGo search results and feeds up to 5 live web snippets directly into the AI's brain (RAG). This enables AIVA to answer about ANY current event (2024, 2025, 2026, and beyond) without being limited by the LLM's training data. |

---

## 📂 File Architecture & Working Principles

### 🔙 Backend (Node.js + Express)

The backend securely processes commands, interacts with external APIs, and manages AI logic.

| File | 📋 Purpose |
|------|-----------|
| 🟢 `backend/server.js` | Entry point — port config (`5000`), CORS, JSON parsing, routes |
| 🛣️ `backend/routes/voice.js` | `POST /api/voice` endpoint — validates payload, delegates to commandService |
| 🧠 `backend/services/commandService.js` | **Core brain** — multilingual greetings, time/date, weather (dual API), live cricket scores, live football scores, news headlines, web search RAG, and Groq AI with rolling 20-message context |
| 📝 `backend/logger.js` | Winston logger — records events/errors to `backend/logs/` |
| 🔒 `backend/middleware/auth.js` | API key authentication — checks `x-api-key` header (bypassed in dev) |
| ⚙️ `backend/.env` | Environment variables — all API keys (see below) |
| 📄 `backend/.env.example` | Template for API keys — copy this to `.env` and fill in your keys |
| 📦 `backend/package.json` | Dependencies: Express, CORS, Dotenv, OpenAI, Winston, node-fetch |

### 🖥️ Frontend (Next.js)

The frontend captures voice input, plays synthesized speech, and renders the futuristic dashboard.

| File | 📋 Purpose |
|------|-----------|
| 🏠 `frontend/pages/index.js` | **Main dashboard** — speech recognition, voice synthesis, text mode, chat-centric layout with mic in input bar, suggestion chips, markdown rendering in chat, responsive design |
| 🔄 `frontend/pages/_app.js` | Next.js wrapper — imports `globals.css` |
| 🔌 `frontend/pages/api/voice.js` | Proxy route — forwards requests to backend (`localhost:5000`) |
| 🎬 `frontend/components/JarvisLoader.js` | **Hacker boot loader** — matrix rain canvas, terminal typewriter, progress bar, glitch text, Web Audio API sounds |
| 🧠 `frontend/services/commandService.js` | Client-side fallback — local time/date when backend unavailable |
| 🎨 `frontend/styles/globals.css` | **Full design system** — CSS variables, layout, animations, glassmorphism, text mode styling, responsive breakpoints |
| 🖼️ `frontend/public/favicon.svg` | Browser tab icon |
| 📦 `frontend/package.json` | Dependencies: Next.js, React, Lucide Icons |

---

## 📖 Setup Instructions

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd AIVA

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2️⃣ Configure API Keys

Copy the example env file and fill in your keys:

```bash
cd backend
cp .env.example .env
```

Then edit `backend/.env` with your keys:

```env
# Server
PORT=5000

# AI Brain (REQUIRED)
GROQ_API_KEY=your_groq_api_key_here

# Weather (REQUIRED for weather commands)
OPENWEATHER_API_KEY=your_openweathermap_key_here
WEATHER_API_KEY=your_weatherapi_key_here

# Live Sports (REQUIRED for live score commands)
CRICKET_API_KEY=your_cricketdata_key_here
SPORTS_API_KEY=your_api_football_key_here

# News (REQUIRED for news commands)
NEWS_API_KEY=your_gnews_key_here
```

### 3️⃣ Start the System

```bash
# Terminal 1 — Start Backend
cd backend
npm start    # or: node server.js

# Terminal 2 — Start Frontend
cd frontend
npm run dev
```

---

## 🗣️ Using the App

1. 🌐 Navigate to `http://localhost:3000`
2. ⏳ Wait for the hacker-style boot sequence to complete
3. ⚡ Click **INITIALIZE** to start AIVA
4. 🎙️ Tap the mic button at the **bottom of the chat** to speak
5. ⌨️ To type instead of speak, say **"Enable text mode"** (or click the status bar). Switch back by saying **"Enable voice mode"** or clicking the mic icon.
6. 💡 Or click **suggestion chips** for quick commands (time, date, weather, jokes)
7. 🔊 Select voices from the dropdown in the navbar *(grouped by language)*

---

## 🧠 How AIVA Processes a Query

Understanding the command processing pipeline:

```
User speaks or types a command
        │
        ▼
┌─── Local Commands (instant, no API) ──────────────┐
│  Time, Date, Greetings, Identity, Jokes,           │
│  App controls, Voice changes, Mode switching       │
└────────────────────────────────────────────────────┘
        │ (not matched?)
        ▼
┌─── Weather APIs ──────────────────────────────────┐
│  OpenWeatherMap (primary) → WeatherAPI (fallback)  │
└────────────────────────────────────────────────────┘
        │ (not a weather query?)
        ▼
┌─── Live Sports APIs ──────────────────────────────┐
│  CricketData (live cricket) / API-Football (live)  │
│  Returns instant structured scores if match is on  │
└────────────────────────────────────────────────────┘
        │ (no live match or not a sports query?)
        ▼
┌─── News API ──────────────────────────────────────┐
│  GNews — top 5 headlines                           │
└────────────────────────────────────────────────────┘
        │ (not a news query?)
        ▼
┌─── AI + Live Web Search (RAG) ────────────────────┐
│  1. Scrape DuckDuckGo for 5 live web snippets      │
│  2. Inject snippets into Llama 3.3 system prompt   │
│  3. AI synthesizes a natural, informed response     │
│  → Handles ALL remaining queries with web context   │
└────────────────────────────────────────────────────┘
```

---

## 🎮 UI Controls

| Control | 📋 Action |
|---------|----------|
| 📋 **Copy Chat** | Copies full conversation to clipboard |
| 🗑️ **Clear Chat** | Wipes session history |
| 🎙️ **Mic/Voice Toggle** | Tap to start/stop listening |
| ⌨️ **Text Mode** | Say "enable text mode" or click the status bar to type |
| 💡 **Suggestion Chips** | Quick commands — time, date, weather, jokes, identity |
| 🔊 **Voice Selector** | Choose from available voices grouped by language |

---

## 🔗 Quick Reference

| 🏷️ Item | 📋 Value |
|---------|---------
| 🌐 Frontend URL | `http://localhost:3000` |
| 🔙 Backend URL | `http://localhost:5000` |
| 🤖 AI Model | `llama-3.3-70b-versatile` (Groq) |
| 🧪 Health Check | `GET http://localhost:5000/health` |
| 👥 Creators | Debasmita Bose & Babin Bid |

---

## 🔒 Security Notes

- All API keys are stored in `backend/.env` which is listed in `.gitignore` — they are **never pushed to GitHub**.
- A `.env.example` file is provided for reference — it contains no real keys.
- Backend API authentication is enforced via `x-api-key` header (bypassed in dev mode).

---

## 🌍 Supported Languages

AIVA currently supports comprehensive voice synthesis, interaction, and natural conversation in the following default languages:

| Language | Code | Greeting | Voice Options |
|----------|------|----------|---------------|
| English | `en` | Hello! | Default English System Voice |
| Hindi | `hi` | नमस्ते! | 1 Male Voice / 1 Female Voice |
