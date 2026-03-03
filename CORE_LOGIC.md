# 🧠 AIVA: Core Logic & Processing Pipeline

This document defines the exact priority order and fallback mechanisms that AIVA uses to process every single voice or text command from the user.

AIVA is designed to be **blisteringly fast** and **cost-efficient**. To achieve this, she uses a strict "Waterfall" priority system. She checks the fastest, cheapest, and most specific local methods first, and only travels down the pipeline to the heavy AI Brain if the local methods cannot handle the request.

Here is the exact step-by-step logic AIVA follows the moment you hit "Send" or stop speaking:

---

## 🏎️ Priority 1: Local Offline Actions (0ms Latency)
*Before AIVA even checks the internet, she checks her local system.*

- **🕒 Time & Date:** If you ask *"What time is it?"* or *"What is the date?"*, AIVA bypasses the AI completely and calculates the exact local time using the Node.js backend.
- **🙋‍♀️ Identity:** If you ask *"Who are you?"* or *"Who made you?"*, she triggers a hard-coded introduction.
- **🗣️ Voice Controls:** If you say *"Change voice to British"* or *"Speak in Hindi"*, she intercepts this command instantly, switches her Text-To-Speech engine, and stops processing.
- **👋 Greetings & Small Talk:** She scans the `backend/data/responses.json` offline lexicon. If you say *"Hello"*, *"Good morning"*, or *"How are you?"* in English, Hindi, Bengali, or several other languages, she immediately pulls a randomly generated, native response from the JSON file and replies instantly without ever waking up the AI.

## 💻 Priority 2: Native Desktop Controls (Windows Only)
*If the command isn't a simple greeting or time check, AIVA checks if you want to control your computer.*

- **📧 Smart Email Drafting:** If you say *"Draft an email to my boss"*, AIVA intercepts the intent. She makes a quick call to the AI to write the *body* of the email, and then natively triggers your computer's default mail client (like Outlook or Gmail Web) with the entire email pre-typed and ready to send.
- **🎛️ Windows OS Controls:** If the command contains phrases like *"Lock screen"*, *"Mute volume"*, *"Empty recycle bin"*, or *"Sleep computer"*, AIVA executes native Windows PowerShell or RunDLL commands to physically control your PC. 

## 🌥️ Priority 3: Weather Tracking (Dual API Fallback)
*If the user is asking about the weather ("What is the weather in Delhi?"), AIVA isolates the city name and begins a dedicated API workflow:*

1. **🥇 Primary Engine (`WeatherAPI.com`):** AIVA pings this API first for highly accurate, minute-by-minute forecasting.
2. **🥈 Fallback Engine (`OpenWeatherMap`):** If `WeatherAPI` is down, rate-limited, or fails to find the city, AIVA automatically catches the error and instantly switches to `OpenWeatherMap`.
3. If both APIs completely freeze or crash, she returns a graceful failure message: *"Weather services are currently unreachable."*

## 🏏 Priority 4: Live Sports Integration
*If you ask about ongoing matches ("What is the live score?"), AIVA looks for specific trigger words:*

- **Cricket:** If she hears "cricket", "IPL", or "World cup", she intercepts the query and pings the `CricketData.org` API to fetch live, ball-by-ball updates.
- **Football/Soccer:** If she hears "football", "soccer", "Premier League", etc., she routes the query to the `API-Football` tracker to fetch live goal updates.
- **Note:** If you ask about a match that happened *in the past* or *will happen in the future*, the Sports APIs will return back empty. AIVA detects this, dynamically realizes it wasn't a "live match" question, and pushes the query down to Priority 6 (Web Search + AI) to find the answer on the internet! 

## 📰 Priority 5: Real-Time News
*If you ask "What are the top 5 news headlines?", AIVA triggers her news sequence:*

- She intercepts the command and extracts the requested number (defaulting to 3, max 10).
- She pings `GNews.io`, explicitly sorting the results by `publishedAt` to bypass any outdated caches and guarantee the freshest possible breaking news.

## 🧠 Priority 6: The AI Brain + Live Web Search (Ultimate Fallback)
*If the command was NOT a greeting, NOT a weather check, NOT a live sports score, and NOT a desktop control... it must be a complex question (e.g., "Summarize quantum physics" or "Who won the US Election?"). AIVA now brings out the heavy artillery.*

1. **🌐 Web Search (DuckDuckGo RAG):** Before talking to the AI, AIVA secretly scrapes DuckDuckGo. She grabs the top 5 most relevant live web snippets from the internet regarding your exact question.
2. **🧩 Context Injection:** She injects these live web snippets, along with the exact current time and date, directly into the AI's "System Prompt". This makes the AI "aware" of the present timeline and current events!
3. **🤖 Dual AI Engine Generation:** AIVA first calls **Gemini 2.5 Flash** (Primary). It's incredibly fast, parses the web snippets, and generates a brilliant, context-aware answer.
4. **⚠️ Groq Llama 3.3 70B Fallback:** If Gemini's free tier hits a rate limit or goes down, AIVA seamlessly and instantly catches the error and re-routes the exact same prompt to **Groq Llama 3.3 70B** as her bulletproof backup brain!
5. **⚠️ Error Handling:** If both systems experience heavy traffic, AIVA safely catches the error and tells the user: *"I'm having trouble connecting to my cloud brain right now..."*

---

### 🎓 Summary of the Flow:
1. **Local JSON & Rules** *(0ms - Free)* -> Matches? **YES** -> Talk!
2. **OS/Email Controls** *(Fast - Free)* -> Matches? **YES** -> Execute!
3. **Targeted APIs (Weather/News/Live Sports)** -> Matches? **YES** -> Talk!
4. **DuckDuckGo Web Scrape** -> Feeds into AI Brain.
5. **Dual AI (Gemini 2.5 Flash -> Groq Llama 3.3)** -> Generates final intelligent response.
