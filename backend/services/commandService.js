const logger = require('../logger');
const OpenAI = require('openai');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Load local static responses to avoid API quotas
const localResponsesPath = path.join(__dirname, '../data/responses.json');
let localResponses = { greetings: {}, smalltalk: {} };
if (fs.existsSync(localResponsesPath)) {
  try {
    localResponses = JSON.parse(fs.readFileSync(localResponsesPath, 'utf8'));
  } catch (e) {
    logger.error('Failed to parse local responses JSON', e);
  }
}

// This service understands multiple Indian languages for basic greetings
// and small talk.  Supported language keywords include Hindi, Bengali,
// Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi and more.
// Responses are currently simple phrases in the same language.

class CommandService {
  constructor() {
    this.openai = null;
    this.geminiAvailable = !!process.env.GEMINI_API_KEY;
    this.chatHistory = []; // Store conversation history
    this.initAI();
  }

  // helper to pick a random element from an array
  randomResponse(options) {
    if (!Array.isArray(options) || options.length === 0) return '';
    return options[Math.floor(Math.random() * options.length)];
  }

  // helper to execute system commands with a promise wrapper
  execPromise(cmd, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      });
    });
  }

  initAI() {
    if (process.env.GROQ_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
      logger.info('Groq API initialized as fallback limit handler.');
    } else {
      logger.warn('GROQ_API_KEY is not set. Groq fallback disabled.');
    }

    if (this.geminiAvailable) {
      logger.info('Gemini API identified for primary routing using Gemini 2.5 Flash.');
    } else {
      logger.warn('GEMINI_API_KEY is not set. Will default to Groq if available.');
    }
  }

  async processCommand(command) {
    // Process exactly what the user said (no artificial punctuation injected)
    let punctuatedCommand = command.trim();

    logger.info(`Processing command: ${punctuatedCommand}`);
    const lowerCmd = punctuatedCommand.toLowerCase();
    if (lowerCmd.includes('namaste') || lowerCmd.includes('नमस्ते')) {
      return "नमस्ते! मैं AIVA हूँ, आपकी सहायक. मैं आपकी कैसे मदद कर सकती हूँ?";
    }
    if (lowerCmd.includes('namaskar') || lowerCmd.includes('नमस्कार')) {
      return "नमस्कार! मैं AIVA, आपकी सहायिका। मैं आपकी कैसे मदद कर सकती हूँ?";
    }
    if (lowerCmd.includes('kem cho') || lowerCmd.includes('કેમ છો')) {
      return "હું મજામાં છું! હું AIVA છું, તમને કેવી રીતે મદદ કરી શકું?";
    }
    if (lowerCmd.includes('kemon acho') || lowerCmd.includes('কেমন আছো') || lowerCmd.includes('nomoshkar')) {
      return "নমস্কার! আমি AIVA, আমি খুব ভালো আছি। আপনাকে কীভাবে সাহায্য করতে পারি?";
    }
    if (lowerCmd.includes('kasa ahes') || lowerCmd.includes('कसा आहेस') || lowerCmd.includes('namaskar') && lowerCmd.includes('aiva')) {
      return "नमस्कार! मी AIVA आहे. मी तुम्हाला कशी मदत करू शकेन?";
    }
    if (lowerCmd.includes('vanakkam') || lowerCmd.includes('வணக்கம்')) {
      return "வணக்கம்! நான் AIVA. நான் உங்களுக்கு எப்படி உதவ முடியும்?";
    }
    if (lowerCmd.includes('namaskaram') || lowerCmd.includes('నమస్కారం')) {
      return "నమస్కారం! నేను AIVA. నేను మీకు ఎలా సహాయం చేయగలను?";
    }

    // Creator-specific override
    if (lowerCmd.includes('debasmita') || lowerCmd.includes('babin') || lowerCmd.includes('who are the creators') || lowerCmd.includes('who made you') || lowerCmd.includes('who is your owner') || lowerCmd.includes('who owns you')) {
      return "My creators are Debasmita Bose and Babin Bid. It is a duo project and built to be helpful, friendly, and a bit quirky.";
    }

    if (lowerCmd.includes('who are you') || lowerCmd.includes('what are you') || lowerCmd.includes('what is your name')) {
      return "I'm AIVA, an Artificial Intelligence Voice Assistant designed by Debasmita Bose and Babin Bid.";
    }

    // ==========================================
    // 🖥️ BROWSER-SAFE COMMANDS (Redirects / Web)
    // ==========================================

    // 🌐 Socials / Apps (Handled as redirects for the browser)
    if (lowerCmd.includes('open youtube')) {
      return { text: "Opening YouTube...", action: 'REDIRECT', url: 'https://www.youtube.com' };
    }
    if (lowerCmd.includes('open google')) {
      return { text: "Opening Google...", action: 'REDIRECT', url: 'https://www.google.com' };
    }
    if (lowerCmd.includes('open spotify')) {
      return { text: "Opening Spotify Web...", action: 'REDIRECT', url: 'https://open.spotify.com' };
    }
    if (lowerCmd.includes('open mail') || lowerCmd.includes('open email')) {
      return { text: "Opening Gmail for you...", action: 'REDIRECT', url: 'https://mail.google.com' };
    }
    if (lowerCmd.includes('play') && (lowerCmd.includes('on youtube') || lowerCmd.includes('youtube'))) {
      const playMatch = command.match(/play\s+(.+?)(?:\s+on\s+youtube|\s+in\s+youtube|\s+youtube)/i) || command.match(/play\s+(.+)/i);
      if (playMatch && playMatch[1]) {
        const query = playMatch[1].trim();
        return {
          text: `Searching YouTube for **${query}**...`,
          action: 'REDIRECT',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
        };
      }
    }

    // ==========================================
    // 💻 NATIVE OS COMMANDS (Windows Base)
    // ==========================================
    if (lowerCmd.includes('mute') && (lowerCmd.includes('volume') || lowerCmd.includes('audio') || lowerCmd.includes('sound'))) {
      if (os.platform() === 'win32') {
        this.execPromise('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
        return "Muting the system volume.";
      }
      return "Native OS controls are currently only active on Windows environments.";
    }

    if (lowerCmd.includes('empty') && (lowerCmd.includes('recycle bin') || lowerCmd.includes('trash'))) {
      if (os.platform() === 'win32') {
        this.execPromise('powershell -Command "Clear-RecycleBin -Force"');
        return "I have emptied the recycle bin for you.";
      }
      return "Native OS controls are currently only active on Windows environments.";
    }

    if (lowerCmd.includes('put') && lowerCmd.includes('sleep') && (lowerCmd.includes('computer') || lowerCmd.includes('pc') || lowerCmd.includes('system'))) {
      if (os.platform() === 'win32') {
        setTimeout(() => { this.execPromise('rundll32.exe powrprof.dll,SetSuspendState 0,1,0'); }, 2000);
        return "Putting the computer to sleep now.";
      }
      return "Native OS controls are currently only active on Windows environments.";
    }

    if (lowerCmd.includes('lock') && (lowerCmd.includes('computer') || lowerCmd.includes('pc') || lowerCmd.includes('screen'))) {
      if (os.platform() === 'win32') {
        this.execPromise('rundll32.exe user32.dll,LockWorkStation');
        return "Locking the workstation.";
      }
      return "Native OS controls are currently only active on Windows environments.";
    }

    if (lowerCmd.includes('shut down') || lowerCmd.includes('shutdown')) {
      if (lowerCmd.includes('confirm') || lowerCmd.includes('yes')) {
        if (os.platform() === 'win32') {
          this.execPromise('shutdown /s /t 10');
          return "Goodbye. Giving you 10 seconds to save your work before shutting down.";
        }
        return "Native OS controls are currently only active on Windows environments.";
      }
      return "Are you sure you want to physically shut down the computer? Say 'confirm shutdown' to proceed.";
    }

    // ==========================================
    // 📧 AI EMAIL DRAFTING
    // ==========================================
    if (lowerCmd.includes('draft an email') || lowerCmd.includes('write an email') || lowerCmd.includes('send an email')) {
      // We use the AI to generate the draft, then open the local mail client!
      logger.info("Email Drafting Triggered...");
      const draftPrompt = `You are a professional email drafter. Write ONLY the email body text based on this request: "${command}". Do not include any greeting or conversational fluff from yourself, strictly output the email content ready to be pasted.`;

      let aiDraftText = "";

      // Fast-track through Gemini 2.5 Flash
      if (this.geminiAvailable) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
          const payload = {
            contents: [{ role: "user", parts: [{ text: draftPrompt }] }],
            generationConfig: { maxOutputTokens: 300 }
          };
          const gRes = await fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (gRes.ok) {
            const gData = await gRes.json();
            if (gData.candidates && gData.candidates[0].content && gData.candidates[0].content.parts[0].text) {
              aiDraftText = gData.candidates[0].content.parts[0].text.trim();
            }
          }
        } catch (e) { }
      }

      // Email drafting via Groq (Fallback)
      if (!aiDraftText && this.openai) {
        try {
          const completion = await this.openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: draftPrompt }],
            max_tokens: 300,
          });
          aiDraftText = completion.choices[0].message.content.trim();
        } catch (e) { }
      }

      if (aiDraftText) {
        return {
          text: "I have drafted the email for you. Opening your secure mail client to review and send!",
          action: 'REDIRECT',
          url: `mailto:?subject=Drafted%20Email&body=${encodeURIComponent(aiDraftText)}`
        };
      }
    }

    // ==========================================
    // ⚡ LOCAL FALLBACKS (Fast & Free)
    // ==========================================

    let cleanCmd = lowerCmd.replace(/[^a-z0-9\s]/gi, '').trim();
    if (cleanCmd === 'hello' || cleanCmd === 'hey' || cleanCmd === 'hii' || cleanCmd === 'yo' || cleanCmd === 'hi') {
      cleanCmd = 'hi';
    }

    // ==========================================
    // 🏠 LOCAL JSON RESPONSES (Instant & No Quota)
    // ==========================================
    try {
      if (fs.existsSync(localResponsesPath)) {
        localResponses = JSON.parse(fs.readFileSync(localResponsesPath, 'utf8'));
      }
    } catch (e) { }

    for (const [key, responses] of Object.entries(localResponses.greetings || {})) {
      if (cleanCmd === key || cleanCmd.startsWith(`${key} `) || cleanCmd.endsWith(` ${key}`)) {
        return this.randomResponse(responses);
      }
    }
    for (const [key, responses] of Object.entries(localResponses.smalltalk || {})) {
      if (cleanCmd.includes(key)) {
        return this.randomResponse(responses);
      }
    }

    // 1. Time & Date (with varied replies)
    const isWeatherQuery = lowerCmd.includes('temperature') || lowerCmd.includes('weather');
    const isSportsQuery = lowerCmd.includes('cricket') || lowerCmd.includes('football') || lowerCmd.includes('sport') || lowerCmd.includes('score') || lowerCmd.includes('match') || lowerCmd.includes('live');
    const isNewsQuery = lowerCmd.includes('news') || lowerCmd.includes('headlines');

    if (!isWeatherQuery && !isSportsQuery && !isNewsQuery) {
      if (lowerCmd.match(/what.*time/) || lowerCmd.includes('current time')) {
        return this.randomResponse([
          `It is ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}.`,
          `Right now it's ${new Date().toLocaleTimeString()}.`,
          `My internal clock says ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}.`,
        ]);
      }
      if (lowerCmd.match(/what.*date/) || lowerCmd.match(/what.*day/) || lowerCmd.includes('current date')) {
        return this.randomResponse([
          `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
          `It's ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
        ]);
      }
    }

    // 🌤️ Weather handling (WeatherAPI.com Primary, OpenWeatherMap Fallback)
    if (lowerCmd.includes('temperature') || lowerCmd.includes('weather')) {
      try {
        let city = '';
        const cityMatch = lowerCmd.match(/in ([a-zA-Z\s]+)/);
        if (cityMatch && cityMatch[1]) {
          city = cityMatch[1].replace('today', '').trim();
        }

        // Default to a known location if no city is found to prevent API errors
        if (!city) {
          city = "Kolkata"; // Default location
        }

        const myOpenWeatherKey = process.env.OPENWEATHER_API_KEY || 'a4fad424377d97a9f6613fb7aeeeec83';
        const myWeatherApiKey = process.env.WEATHER_API_KEY || '14d4a5817fca43efb4c173415261102';

        // 1. Primary: WeatherAPI.com (Higher Accuracy)
        try {
          const wapiUrl = `https://api.weatherapi.com/v1/current.json?key=${myWeatherApiKey}&q=${encodeURIComponent(city)}&aqi=no`;
          const wapiRes = await fetch(wapiUrl, { timeout: 8000 });
          if (wapiRes.ok) {
            const data = await wapiRes.json();
            return `The weather in ${data.location.name} is currently ${data.current.temp_c}°C, ${data.current.condition.text}.`;
          }
        } catch (e) {
          logger.warn('WeatherAPI failed, falling back to OpenWeatherMap:', e.message);
        }

        // 2. Fallback: OpenWeatherMap
        try {
          const owUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${myOpenWeatherKey}&units=metric`;
          const owRes = await fetch(owUrl, { timeout: 8000 });
          if (owRes.ok) {
            const data = await owRes.json();
            return `The current weather in ${data.name} is ${Math.round(data.main.temp)}°C with ${data.weather[0].description}.`;
          }
        } catch (e) {
          logger.warn('OpenWeatherMap fallback failed:', e.message);
        }

        return `Sorry, I couldn't fetch the weather for ${city} right now.`;
      } catch (e) {
        logger.error("Weather Error:", e);
        return `I'm having trouble getting the weather at the moment — please try again later.`;
      }
    }

    // 🏏 Live Cricket Scores (CricketData.org)
    if (lowerCmd.includes('cricket') && (lowerCmd.includes('score') || lowerCmd.includes('match') || lowerCmd.includes('live'))) {
      const myCricketKey = process.env.CRICKET_API_KEY || '89e10f96-68cc-437a-bdd3-f8124614959a';
      try {
        const url = `https://api.cricapi.com/v1/currentMatches?apikey=${myCricketKey}&offset=0`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const match = data.data.find(m => m.matchStarted) || data.data[0];
            return `In cricket, ${match.name}. The status is: ${match.status}.`;
          }
        }
      } catch (e) {
        logger.warn('Cricket API failed. Will fallback to general AI search.', e.message);
      }
    }

    // ⚽ Live Live Sports / Football Scores (api-football)
    if ((lowerCmd.includes('football') || lowerCmd.includes('sport')) && (lowerCmd.includes('score') || lowerCmd.includes('match'))) {
      const mySportsKey = process.env.SPORTS_API_KEY || 'f20346c764729f1e355eed7131658928';
      try {
        const url = `https://v3.football.api-sports.io/fixtures?live=all`;
        const res = await fetch(url, { headers: { "x-apisports-key": mySportsKey } });
        if (res.ok) {
          const data = await res.json();
          if (data.response && data.response.length > 0) {
            const match = data.response[0];
            return `In live football, ${match.teams.home.name} is playing ${match.teams.away.name}. The score is ${match.goals.home} to ${match.goals.away}.`;
          }
        }
      } catch (e) {
        logger.warn('Sports API failed. Will fallback to general AI search.', e.message);
      }
    }

    // 📰 News Reader
    if (lowerCmd.includes('news') || lowerCmd.includes('headlines')) {
      const countMatch = lowerCmd.match(/(\d+)\s+news/);
      const newsCount = countMatch ? Math.min(parseInt(countMatch[1]), 10) : 3;
      let newsFound = false;
      let newsResponseText = "";

      // 1. Primary News: GNews
      try {
        const gnewsKey = process.env.NEWS_API_KEY;
        if (gnewsKey) {
          const url = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=${newsCount}&sortby=publishedAt&apikey=${gnewsKey}`;
          const res = await fetch(url, { timeout: 6000 });
          if (res.ok) {
            const data = await res.json();
            if (data.articles && data.articles.length > 0) {
              const headlines = data.articles.map((a, i) => `${i + 1}. ${a.title}`).join('. ');
              newsResponseText = `Here are the latest ${data.articles.length} news headlines right now: ${headlines}.`;
              newsFound = true;
            }
          }
        }
      } catch (e) {
        logger.warn('GNews API failed:', e.message);
      }

      // 2. Fallback News: NewsAPI.org
      if (!newsFound) {
        try {
          const newsApiOrgKey = "65724e5b14374ff6bafada1653619166"; // Specific key provided by user
          const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=${newsCount}&apiKey=${newsApiOrgKey}`;
          const res = await fetch(url, { headers: { 'User-Agent': 'AIVA-Assistant' }, timeout: 6000 });
          if (res.ok) {
            const data = await res.json();
            if (data.articles && data.articles.length > 0) {
              const headlines = data.articles.map((a, i) => `${i + 1}. ${a.title}`).join('. ');
              newsResponseText = `Here are the top ${data.articles.length} global headlines: ${headlines}.`;
              newsFound = true;
            }
          }
        } catch (e) {
          logger.warn('NewsAPI.org fallback failed:', e.message);
        }
      }

      if (newsFound) {
        return newsResponseText;
      }
      logger.warn('All news APIs failed. Will fallback to general AI search.');
    }

    // (Moved LOCAL JSON handling higher up to guarantee 0ms latency for greetings)

    if (lowerCmd.includes('change your voice') && (lowerCmd.includes('can you') || lowerCmd.includes('will you') || lowerCmd.includes('if i tell you'))) {
      return "Sure! Tell me 'change voice to' plus the name, and I'll switch to a new personality.";
    }

    // 🔊 Voice Control
    const voiceMatch = lowerCmd.match(/(change|set|switch) (your )?voice to (.+)/i);
    if (voiceMatch) {
      const targetVoice = voiceMatch[3].trim();
      return {
        text: `Changing voice to ${targetVoice}.`,
        action: 'CHANGE_VOICE',
        voiceName: targetVoice
      };
    }


    // 4. Fun / Easter Eggs
    if (lowerCmd.includes('tell me a joke')) {
      const jokes = [
        "Why did the scarecrow win an award? Because he was outstanding in his field.",
        "I told my computer I needed a break, and now it won't stop sending me Kit-Kats.",
        "Why do programmers prefer dark mode? Because light attracts bugs."
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (lowerCmd.includes('meaning of life')) {
      return "42.";
    }
    if (lowerCmd.includes('open the pod bay doors')) {
      return "I'm sorry, Dave. I'm afraid I can't do that.";
    }

    // 5. Math Fallback
    if (lowerCmd.match(/what is \d+ [\+\-\*\/] \d+/)) {
      try {
        const parts = lowerCmd.match(/(\d+) ([\+\-\*\/]|plus|minus|times|divided by) (\d+)/);
        if (parts) {
          let n1 = parseInt(parts[1]);
          let n2 = parseInt(parts[3]);
          let op = parts[2];
          let result = 0;
          if (op === '+' || op === 'plus') result = n1 + n2;
          else if (op === '-' || op === 'minus') result = n1 - n2;
          else if (op === '*' || op === 'times') result = n1 * n2;
          else if (op === '/' || op === 'divided by') result = n1 / n2;
          return `The answer is ${result}.`;
        }
      } catch (e) { /* ignore */ }
    }

    // ==========================================
    // 🧠 AI PROCESSING (Gemini 2.5 Flash Primary -> Groq Fallback)
    // ==========================================
    if (this.geminiAvailable || this.openai) {
      try {
        const now = new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        });

        // 🌍 REAL-TIME WEB CONTEXT
        let webContext = "";

        const systemPrompt = `You are AIVA, a calm, intelligent, friendly, and conversational voice assistant inspired by JARVIS. You were created by Debasmita Bose and Babin Bid.
Current Date & Time: ${now}
Always respond naturally, warmly, and with personality. Vary your phrasing so you don't sound robotic or repetitive.
Be polite, upbeat, and ask follow-up questions when it makes sense.
Make the user feel like they're talking to a helpful friend.
Feel free to use markdown formatting like **bold** and *italic* to emphasize important words or names.
Do not repeat the user's input.
Be accurate, context-aware, and show a bit of wit or charm when appropriate.
Keep responses concise (2-4 sentences for simple queries, more for detailed ones).`;

        let aiTextResponse = "";

        // Helper to call Gemini securely
        const fetchGemini = async (sysContext = systemPrompt) => {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
          const geminiHistory = this.chatHistory.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }));

          const payload = {
            contents: [...geminiHistory, { role: "user", parts: [{ text: command }] }],
            systemInstruction: { parts: [{ text: sysContext }] },
            generationConfig: { maxOutputTokens: 600 }
          };

          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 12000);

          try {
            const gRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
            clearTimeout(fetchTimeout);

            if (gRes.ok) {
              const gData = await gRes.json();
              if (gData.candidates && gData.candidates[0].content && gData.candidates[0].content.parts[0].text) {
                return gData.candidates[0].content.parts[0].text;
              }
            } else if (gRes.status === 429) {
              logger.warn("Gemini limit exceeded. Retrying...");
              await new Promise(resolve => setTimeout(resolve, 8000));
              const retryRes = await fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                if (retryData.candidates && retryData.candidates[0].content && retryData.candidates[0].content.parts[0].text) {
                  return retryData.candidates[0].content.parts[0].text;
                }
              }
            }
          } catch (e) {
            logger.warn("Gemini Fetch Error:", e.message);
          }
          return "";
        };

        // 1. Primary AI: Gemini 2.5 Flash
        if (this.geminiAvailable) {
          aiTextResponse = await fetchGemini();

          if (aiTextResponse) {
            const lowerResp = aiTextResponse.toLowerCase();
            const hitCutoff = lowerResp.includes('knowledge cutoff') ||
              lowerResp.includes('real-time information') ||
              lowerResp.includes('do not have access') ||
              lowerResp.includes('as of my current information') ||
              lowerResp.includes('i don\'t have') ||
              lowerResp.includes('cannot find the specific result') ||
              lowerResp.includes('don\'t have the specific') ||
              lowerResp.includes('i do not have') ||
              lowerResp.includes('i don\'t know');

            if (hitCutoff) {
              logger.info('Gemini hit a knowledge cutoff. Intercepting and triggering Web Search...');
              aiTextResponse = ""; // Clear the failed response

              // 3. Web Search API Fallback (Tavily)
              if (process.env.TVLY_API_KEY) {
                try {
                  const tRes = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ api_key: process.env.TVLY_API_KEY, query: command, search_depth: "basic" })
                  });
                  if (tRes.ok) {
                    const tData = await tRes.json();
                    if (tData.results && tData.results.length > 0) {
                      webContext = tData.results.map(r => r.content).join(" | ");
                    }
                  }
                } catch (e) { logger.warn('Tavily lookup fail:', e.message); }
              }

              // 4. Web Search API Fallback (Google Custom Search)
              if (!webContext && process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
                try {
                  const gUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(command)}`;
                  const res = await fetch(gUrl);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.items && data.items.length > 0) {
                      webContext = data.items.map(i => i.snippet).join(" | ");
                    }
                  }
                } catch (e) { logger.warn('Google lookup fail:', e.message); }
              }

              if (webContext) {
                logger.info("Web context fetched! Rerunning Gemini...");
                const updatedPrompt = systemPrompt + `\n\nLIVE INTERNET SEARCH RESULTS REGARDING USER QUERY:\n${webContext}\nUse the internet search results above to accurately answer the user's query.`;
                aiTextResponse = await fetchGemini(updatedPrompt);
              }
            }
          }
        }

        // 2. Secondary AI: Groq Fallback
        if (!aiTextResponse && this.openai) {
          logger.info('Using Groq fallback...');
          const messages = [
            { role: "system", content: webContext ? systemPrompt + `\nLIVE INTERNET SEARCH:\n${webContext}` : systemPrompt },
            ...this.chatHistory,
            { role: "user", content: command }
          ];
          try {
            const completion = await this.openai.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              messages: messages,
              max_tokens: 600,
            });
            aiTextResponse = completion.choices[0].message.content;
          } catch (e) {
            logger.warn('Groq Error, falling back to Web Search APIs:', e.message);
          }
        }

        // 3. Web Search API Fallback (Tavily)
        if (!aiTextResponse && process.env.TVLY_API_KEY) {
          logger.info('Using Tavily fallback...');
          try {
            const tvlyApiKey = process.env.TVLY_API_KEY;
            const tRes = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: tvlyApiKey, query: command, search_depth: "advanced" })
            });
            if (tRes.ok) {
              const tData = await tRes.json();
              if (tData.results && tData.results.length > 0) {
                aiTextResponse = `I found this information online via Tavily Search: ${tData.results[0].content}`;
              }
            }
          } catch (e) {
            logger.warn('Tavily API Error, falling back to Google Search:', e.message);
          }
        }

        // 4. Web Search API Fallback (Google Custom Search Engine)
        if (!aiTextResponse && process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
          logger.info('Using Google Search fallback...');
          try {
            const gUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(command)}`;
            const res = await fetch(gUrl);
            if (res.ok) {
              const data = await res.json();
              if (data.items && data.items.length > 0) {
                aiTextResponse = `I found this on Google Search: ${data.items[0].snippet}`;
              }
            }
          } catch (e) {
            logger.warn('Google Search Error:', e.message);
          }
        }

        if (aiTextResponse) {
          // Update history
          this.chatHistory.push({ role: "user", content: command });
          this.chatHistory.push({ role: "assistant", content: aiTextResponse });
          if (this.chatHistory.length > 20) {
            this.chatHistory = this.chatHistory.slice(this.chatHistory.length - 20);
          }
          return aiTextResponse;
        } else {
          logger.error('All AI endpoints and Search fallbacks failed to respond.');
          return "I'm having trouble connecting to my cloud brain and search engines right now. Please try again later when traffic subsides.";
        }
      } catch (err) {
        logger.error('AI Error:', err);
        return "I encountered an error while thinking about that. Let's try something else!";
      }
    }

    return "I'm sorry, but my AI brain is currently offline. Please check my configuration keys.";
  }

  logTelemetry(data) {
    logger.info('Telemetry:', data);
  }
}

module.exports = new CommandService();
