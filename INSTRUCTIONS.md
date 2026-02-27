# 🤖 AIVA — User Guide & Internal Architecture

> Welcome to the internal documentation and user guide for **AIVA** *(Artificially Intelligent Voice Assistant)*. This document explains the core idea and the working principles of every file.

---

## 💡 Project Idea

AIVA is a full-stack, JARVIS-inspired web-based voice assistant. It delivers an interactive, voice-first experience with a futuristic UI *(glassmorphism, neon glows, hacker-style boot sequence)*.

🧠 The assistant handles:
- 💬 General conversations
- 🌍 Localized greetings in **10+ Indian languages**
- ⏰ Current time & date
- 🌦️ Weather information *(OpenWeatherMap + WeatherAPI)*
- 🏏 Live Sports & Match Scores *(CricketData + API-Football)*
- 📰 Live News & Headlines *(GNews API)*
- 🔍 General information *(DuckDuckGo / Wikipedia)*
- 🤖 Conversational AI via **Llama 3.3 70B** (Groq)

---

## 📂 File Architecture & Working Principles

### 🔙 Backend (Node.js + Express)

The backend securely processes commands, interacts with external APIs, and manages AI logic.

| File | 📋 Purpose |
|------|-----------|
| 🟢 `backend/server.js` | Entry point — port config (`5000`), CORS, JSON parsing, routes |
| 🛣️ `backend/routes/voice.js` | `POST /api/voice` endpoint — validates payload, delegates to commandService |
| 🧠 `backend/services/commandService.js` | **Core brain** — multilingual greetings, time/date, weather, DuckDuckGo, Wikipedia, Groq AI (rolling 20-message context) |
| 📝 `backend/logger.js` | Winston logger — records events/errors to `backend/logs/` |
| 🔒 `backend/middleware/auth.js` | API key authentication — checks `x-api-key` header (bypassed in dev) |
| ⚙️ `backend/.env` | Environment variables — `PORT`, `GROQ_API_KEY` |
| 📦 `backend/package.json` | Dependencies: Express, CORS, Dotenv, OpenAI, Winston |

### 🖥️ Frontend (Next.js)

The frontend captures voice input, plays synthesized speech, and renders the futuristic dashboard.

| File | 📋 Purpose |
|------|-----------|
| 🏠 `frontend/pages/index.js` | **Main dashboard** — speech recognition, voice synthesis, chat-centric layout with mic in input bar, suggestion chips, responsive design |
| 🔄 `frontend/pages/_app.js` | Next.js wrapper — imports `globals.css` |
| 🔌 `frontend/pages/api/voice.js` | Proxy route — forwards requests to backend (`localhost:5000`) |
| 🎬 `frontend/components/JarvisLoader.js` | **Hacker boot loader** — matrix rain canvas, terminal typewriter, progress bar, glitch text, Web Audio API sounds |
| 🧠 `frontend/services/commandService.js` | Client-side fallback — local time/date, DuckDuckGo searches when backend unavailable |
| 🎨 `frontend/styles/globals.css` | **Full design system** — CSS variables, layout, animations, glassmorphism, responsive breakpoints |
| 🖼️ `frontend/public/favicon.svg` | Browser tab icon |
| 📦 `frontend/package.json` | Dependencies: Next.js, React, Lucide Icons |

---

## 📖 Instructions

### ▶️ Starting the System

1. 🔙 **Backend:** Open a terminal in `backend/`
   - ⚙️ Ensure `.env` has `PORT=5000` and config keys (GROQ_API_KEY, OPENWEATHER_API_KEY, WEATHER_API_KEY, CRICKET_API_KEY, SPORTS_API_KEY, NEWS_API_KEY).
   - 📦 Run `npm install` then `node server.js`

2. 🖥️ **Frontend:** Open a terminal in `frontend/`
   - 📦 Run `npm install` then `npm run dev`

### 🗣️ Using the App

1. 🌐 Navigate to `http://localhost:3000`
2. ⏳ Wait for the hacker-style boot sequence to complete
3. ⚡ Click **INITIALIZE** to start AIVA
4. 🎙️ Tap the mic button at the **bottom of the chat** to speak
5. ⌨️ To type instead of speak, say **"Enable text mode"** (or click the status bar). Switch back by saying **"Enable voice mode"** or clicking the mic icon.
6. 💡 Or click **suggestion chips** for quick commands (time, date, weather, jokes)
7. 🔊 Select voices from the dropdown in the navbar *(grouped by language)*

### 🎮 UI Controls

| Control | 📋 Action |
|---------|----------|
| 📋 **Copy Chat** | Copies full conversation to clipboard |
| 🗑️ **Clear Chat** | Wipes session history |
| 🎙️ **Mic/Voice Toggle** | Tap to start/stop listening, or click to switch modes |
| 💡 **Suggestion Chips** | Quick commands — time, date, weather, jokes, identity |

---

## 🔗 Quick Reference

| 🏷️ Item | 📋 Value |
|---------|---------|
| 🌐 Frontend URL | `http://localhost:3000` |
| 🔙 Backend URL | `http://localhost:5000` |
| 🔑 API Key | Set `GROQ_API_KEY` in `backend/.env` |
| 🤖 AI Model | `llama-3.3-70b-versatile` |
| 🧪 Health Check | `GET http://localhost:5000/health` |
