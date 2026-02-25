# 🤖 AIVA - Artificially Intelligent Voice Assistant 🎙️

A full-stack, JARVIS-inspired voice assistant web application.

## 🏗️ Architecture

- 🔙 **Backend**: Node.js + Express server with API key authentication, CORS, and REST APIs.
- 🖥️ **Frontend**: Next.js application with futuristic UI and voice interaction.

## ✨ Features

- 🗣️ **Voice command input** using Web Speech API (speech recognition)
- 🔊 **Text‑to‑speech replies** with dynamic voices and emoji support
- 🌍 **Multilingual greetings** – Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi and English
- � **Voice selection** now lists individual voices grouped by language; Indian accent variants (e.g. hi-IN, ta-IN, pa-IN) are prioritized and you can pick voices for each script so users from any part of India hear the proper accent. (Work in progress – additional regional voices and accents are still being added.)
- 🔥 Enhanced **weather lookup** with retries and Open‑Meteo fallback
- ✅ Smart **chat UI** with timestamps, copy/clear/history buttons, hover effects and visualizer
- 🎙️ Ready‑to‑speak cue when microphone is activated
- 🔒 Secure API communication via `x-api-key` header (bypassed in development)
- 💡 Toggleable HUD overlay, custom styles and status indicators
- 🔮 Futuristic theme with glassmorphism, animated arc reactor and loader

## 🛠 Improvements

- Removed unused files & logs; added cleanup guidance
- Proxy frontend API to backend for consistent responses
- Friendly, varied replies and personality injected via system prompt
- Automatic prevention of duplicate messages
- Emoji added throughout interface and responses
- Loaders and boot sequence polished; annoying text removed
- Utility to delete/clean workspace via shell commands

## 🚀 Setup

### 🔙 Backend

1. Navigate to `backend` directory.
2. Install dependencies: `npm install`
3. Set environment variables in `.env` (API_KEY, PORT)
4. Run: `npm start`

### 🖥️ Frontend

1. Navigate to `frontend` directory.
2. Install dependencies: `npm install`
3. Run: `npm run dev`

Open <http://localhost:3000> in your browser.

## 🔌 API Endpoints

- `POST /api/voice` – process a `{command:string}` payload and receive
  a JSON `{response:string,action?,voiceName?}`. Includes built‑in language
  fallbacks and AI (Grok) when configured.
- `POST /api/telemetry` – optional logging of usage data (same auth).

All endpoints require the `x-api-key` header against the value in `.env`.
Development mode skips the check for convenience.

> Frontend `/api/voice` is now a proxy to the backend server; set

* voice menu populates from the browser's SpeechSynthesis API, filtering for English and Indian languages. Use the language shortcuts to quickly jump to a regional voice, or scroll through grouped voices to choose a specific accent.

> `BACKEND_URL` environment variable if running the backend elsewhere.

## 🧠 Philosophy

Voice-first interaction, intelligent and responsive behavior.
