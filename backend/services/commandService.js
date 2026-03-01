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
      logger.info('Gemini API identified for primary routing.');
    } else {
      logger.warn('GEMINI_API_KEY is not set. Will default to Groq if available.');
    }
  }

  async processCommand(command) {
    logger.info(`Processing command: ${command}`);
    const lowerCmd = command.toLowerCase();

    // quick Indian language offline fallback greetings
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
    if (lowerCmd.includes('debasmita') || lowerCmd.includes('babin') || lowerCmd.includes('who are the creators') || lowerCmd.includes('who made you')) {
      return "My creators are Debasmita Bose and Babin Bid. It is a duo project and built to be helpful, friendly, and a bit quirky.";
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

      // Fast-track through Gemini
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

      // Fallback Groq
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

    // 1. Time & Date (with varied replies)
    // Exclude "temperature" or "weather" queries from matching "day" or "date"
    const isWeatherQuery = lowerCmd.includes('temperature') || lowerCmd.includes('weather');

    if (!isWeatherQuery && (lowerCmd.match(/what.*time/) || lowerCmd.includes('current time'))) {
      return this.randomResponse([
        `It is ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}.`,
        `Right now it's ${new Date().toLocaleTimeString()}.`,
        `My internal clock says ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}.`,
      ]);
    }
    if (!isWeatherQuery && (lowerCmd.match(/what.*date/) || lowerCmd.match(/what.*day/) || lowerCmd.includes('current date'))) {
      return this.randomResponse([
        `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
        `It's ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      ]);
    }

    // 🌤️ Weather handling (OpenWeatherMap Primary, WeatherAPI Fallback)
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

        // 1. Primary: OpenWeatherMap
        try {
          const owUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${myOpenWeatherKey}&units=metric`;
          const owRes = await fetch(owUrl, { timeout: 8000 });
          if (owRes.ok) {
            const data = await owRes.json();
            return `The current weather in ${data.name} is ${Math.round(data.main.temp)}°C with ${data.weather[0].description}.`;
          }
        } catch (e) {
          logger.warn('OpenWeatherMap fallback triggered:', e.message);
        }

        // 2. Fallback: WeatherAPI.com
        try {
          const wapiUrl = `https://api.weatherapi.com/v1/current.json?key=${myWeatherApiKey}&q=${encodeURIComponent(city)}&aqi=no`;
          const wapiRes = await fetch(wapiUrl, { timeout: 8000 });
          if (wapiRes.ok) {
            const data = await wapiRes.json();
            return `The weather in ${data.location.name} is currently ${data.current.temp_c}°C, ${data.current.condition.text}.`;
          }
        } catch (e) {
          logger.warn('WeatherAPI fallback failed:', e.message);
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
        logger.warn('Cricket API failed:', e.message);
        return "I couldn't reach the cricket servers right now.";
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
        logger.warn('Sports API failed:', e.message);
      }
    }

    // 📰 News Reader
    if (lowerCmd.includes('news') || lowerCmd.includes('headlines')) {
      try {
        const newsKey = process.env.NEWS_API_KEY;
        if (!newsKey) {
          return "I can fetch the news for you, but you need to add a NEWS_API_KEY in the backend environment variables. You can easily get a free one from GNews.io or NewsAPI.org.";
        }
        const url = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=3&apikey=${newsKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.articles && data.articles.length > 0) {
            const headlines = data.articles.map((a, i) => `${i + 1}. ${a.title}`).join('. ');
            return `Here are the top news headlines: ${headlines}.`;
          }
          return "I couldn't find any recent news stories.";
        }
      } catch (e) {
        logger.warn('News API failed:', e.message);
      }
    }

    // ==========================================
    // 🏠 LOCAL JSON RESPONSES (No API Quota Used)
    // ==========================================
    // Dynamically pull responses.json so updates apply cleanly without requiring manual server reboots
    try {
      if (fs.existsSync(localResponsesPath)) {
        localResponses = JSON.parse(fs.readFileSync(localResponsesPath, 'utf8'));
      }
    } catch (e) { }

    // Trim punctuation to perfectly hit JSON keys (e.g. "hi." must trigger key "hi")
    const cleanCmd = lowerCmd.replace(/[^a-z0-9\s]/gi, '').trim();

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
    // 🧠 AI PROCESSING (Gemini Primary -> Groq Fallback)
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

        // 🌍 REAL-TIME WEB CONTEXT — Fetch search snippets + actual page content
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

        // 1. Primary AI: Gemini
        if (this.geminiAvailable) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

            const geminiHistory = this.chatHistory.map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            }));

            const payload = {
              contents: [...geminiHistory, { role: "user", parts: [{ text: command }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { maxOutputTokens: 600 }
            };

            const gRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (gRes.ok) {
              const gData = await gRes.json();
              if (gData.candidates && gData.candidates[0].content && gData.candidates[0].content.parts[0].text) {
                aiTextResponse = gData.candidates[0].content.parts[0].text;
              }
            } else if (gRes.status === 429) {
              logger.warn("Gemini limit exceeded. Switching to Groq fallback.");
            } else {
              logger.warn(`Gemini API Error: ${gRes.status}`);
            }
          } catch (geminiErr) {
            logger.warn("Gemini Fetch Error, falling back to Groq:", geminiErr.message);
          }
        }

        // 2. Secondary AI: Groq Fallback
        if (!aiTextResponse && this.openai) {
          logger.info('Using Groq fallback...');
          const messages = [
            { role: "system", content: systemPrompt },
            ...this.chatHistory,
            { role: "user", content: command }
          ];
          const completion = await this.openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            max_tokens: 600,
          });
          aiTextResponse = completion.choices[0].message.content;
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
          logger.error('Both Gemini and Groq failed to respond.');
          return "I'm having trouble connecting to my cloud brain right now. Please try again later when traffic subsides.";
        }
      } catch (error) {
        logger.error('AI Routing Error:', error);
        return "I'm having unexpected trouble connecting to my brain right now. Please try again.";
      }
    }

    return "I'm sorry, but my AI brain is currently offline. Please check my configuration keys.";
  }

  logTelemetry(data) {
    logger.info('Telemetry:', data);
  }
}

module.exports = new CommandService();
