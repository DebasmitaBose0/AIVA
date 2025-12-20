# 🤖 AIVA - Artificially Intelligent Voice Assistant 🎙️

A full-stack, JARVIS-inspired voice assistant web application.

## 🏗️ Architecture

- 🔙 **Backend**: Node.js + Express server with API key authentication, CORS, and REST APIs.
- 🖥️ **Frontend**: Next.js application with futuristic UI and voice interaction.

## ✨ Features

- 🗣️ Voice command input using Web Speech API
- 🔊 Text-to-speech responses
- 🔒 Secure API communication
- 🔮 Futuristic HUD-style interface
- 🌑 Dark theme with cyan highlights and glassmorphism effects

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

Open http://localhost:3000 in your browser.

## 🔌 API Endpoints

- `POST /api/voice`: Process voice commands
- `POST /api/telemetry`: Log telemetry data

All endpoints require `x-api-key` header.

## 🧠 Philosophy

Voice-first interaction, intelligent and responsive behavior.