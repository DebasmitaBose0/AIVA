# 🤖 AIVA - User Guide & Internal Architecture

Welcome to the internal documentation and user guide for AIVA (Artificially Intelligent Voice Assistant). This document explains the core idea behind the project and details the working principles of all individual files within the codebase.

---

## 💡 Project Idea
AIVA is a full-stack, JARVIS-inspired web-based voice assistant. It focuses on providing an interactive, voice-first experience with a sleek, futuristic UI (glassmorphism, neon glows, and animated arc reactors). 
The assistant can handle general conversations, provide localized greetings in multiple Indian languages, fetch current time/date, weather, and general information (via DuckDuckGo / Wikipedia), and leverage a powerful Large Language Model (Llama 3.3 via Groq) for conversational intelligence.

---

## 📂 File Working Principles & Architecture

### 🔙 Backend (Node.js + Express)
The backend is responsible for securely processing commands, interacting with external APIs, and managing the AI logic.

*   **`backend/server.js`**
    *   **Working Principle:** This is the entry point for the Express server. It sets up the server port (default `5000`), configures CORS to accept requests from the frontend, initializes JSON body parsing, and registers the `/api/voice` route alongside a simple `/health` check endpoint.
*   **`backend/routes/voice.js`**
    *   **Working Principle:** Defines the primary `POST /api/voice` endpoint. It applies authentication middleware (`auth.js`), validates the incoming payload to ensure a command is present, and delegates the actual command processing to the `commandService.js`. It then formats and sends the generated response back to the client.
*   **`backend/services/commandService.js`**
    *   **Working Principle:** This is the core "brain" of the backend.
        *   It handles hardcoded multilingual greetings (Hindi, Bengali, Tamil, etc.).
        *   It processes local utilities like time, date, and basic math.
        *   It integrates with external APIs for weather (`wttr.in` and `open-meteo`), quick knowledge (`DuckDuckGo` API), and summaries (`Wikipedia` API).
        *   It integrates with the Groq API (using the `llama-3.3-70b-versatile` model) to handle complex, conversational queries. It maintains a rolling chat history of the last 20 messages for context.
*   **`backend/logger.js`** *(Utility)*
    *   **Working Principle:** Provides logging functionalities (typically using Winston or a similar library) to record system events, errors, and telemetry into the `backend/logs/` directory.
*   **`backend/middleware/auth.js`** *(Utility)*
    *   **Working Principle:** Secures the backend API endpoints by checking for an `x-api-key` header matching the environment variables, ensuring unauthorized clients cannot spam the backend.

### 🖥️ Frontend (Next.js)
The frontend serves as the interactive UI, capturing user voice input, playing back synthesized speech, and rendering the futuristic HUD.

*   **`frontend/pages/index.js`**
    *   **Working Principle:** The main dashboard and UI controller. 
        *   **Speech Recognition:** Utilizes the browser's `webkitSpeechRecognition` API to capture microphone input.
        *   **Voice Synthesis:** Uses `speechSynthesis` to speak bot responses. It heavily filters and groups available system voices, prioritizing Indian accents for multilingual replies.
        *   **UI/UX:** Renders the chat history bubble layout, a glowing animated "Arc Reactor" mic button linked to the user's audio frequency (volume visualizer), and a toggleable HUD showing fake system stats for aesthetic purposes.
        *   **API Communication:** Forwards recognized text to the Next.js API route (`/api/voice`) for processing.
*   **`frontend/pages/_app.js`**
    *   **Working Principle:** The standard Next.js application wrapper. It imports the global stylesheet (`styles/globals.css`) necessary for the app's dark, neon aesthetic.
*   **`frontend/pages/api/voice.js`**
    *   **Working Principle:** A Next.js API route that acts strictly as a proxy. It takes the client's request from the browser and forwards it to the dedicated Node.js backend (default `http://localhost:5000/api/voice`). This circumvents CORS issues on the client side and hides the backend IP/Port configuration from the browser.
*   **`frontend/components/JarvisLoader.js`**
    *   **Working Principle:** An immersive loading screen component. It simulates an AI boot sequence with typing text animations ("ARC REACTOR ONLINE...", "BOOTING JARVIS AI..."), sound effects generated via the Web Audio API (oscillators), and a 3D-looking SVG loader. It waits for the backend health check to pass before transitioning to the main UI.
*   **`frontend/services/commandService.js`**
    *   **Working Principle:** A client-side fallback/utility script. While most logic is handled by the backend, this local service contains redundant fallback logic (like local time evaluation or DuckDuckGo searches) to allow the app to function minimally even if the backend LLM is unresponsive.

---

## 📖 Instructions for Developers & Users

1.  **Starting the System:**
    *   **Backend:** Open a terminal in the `backend/` folder. Ensure `.env` is configured with `PORT=5000` and `GROK_API_KEY`. Run `npm install` and then `node server.js` (or `npm start`).
    *   **Frontend:** Open a terminal in the `frontend/` folder. Make sure `.env` has `NEXT_PUBLIC_API_KEY` matching the backend. Run `npm install` and then `npm run dev`.
2.  **Using the App:**
    *   Navigate to `http://localhost:3000`.
    *   Wait for the "Jarvis Loader" boot sequence to complete.
    *   Click "INITIALIZE AIVA PROTOCOL".
    *   Click the glowing Microphone button to speak. Speak your command clearly (e.g., "What is the weather in Delhi?", "Tell me a joke").
    *   You can select specific voices from the dropdown menu, which are grouped by language to help you find the best regional accent.
3.  **UI Controls:**
    *   **Copy Chat:** Copies the entire conversation log to your clipboard.
    *   **Clear Chat:** Wipes the current session history.
    *   **Show/Hide HUD:** Toggles the "hacker-style" system telemetry overlay in the corners of the screen.
