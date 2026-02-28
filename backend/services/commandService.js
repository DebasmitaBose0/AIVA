const logger = require('../logger');
const OpenAI = require('openai');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// This service understands multiple Indian languages for basic greetings
// and small talk.  Supported language keywords include Hindi, Bengali,
// Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi and more.
// Responses are currently simple phrases in the same language.

class CommandService {
  constructor() {
    this.openai = null;
    this.chatHistory = []; // Store conversation history
    this.initGrok();
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

  initGrok() {
    if (process.env.GROQ_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
      logger.info('Groq API initialized.');
    } else {
      logger.warn('GROQ_API_KEY is not set. AI features will be disabled.');
    }
  }

  async processCommand(command) {
    logger.info(`Processing command: ${command}`);
    const lowerCmd = command.toLowerCase();

    // quick Hindi greetings
    if (lowerCmd.includes('namaste') || lowerCmd.includes('नमस्ते')) {
      return "नमस्ते! मैं AIVA हूँ, आपकी सहायक. मैं आपकी कैसे मदद कर सकती हूँ?";
    }
    if (lowerCmd.includes('namaskar') || lowerCmd.includes('नमस्कार')) {
      return "नमस्कार! मैं AIVA, आपकी सहायिका। मैं आपकी कैसे मदद कर सकती हूँ?";
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

    // 2. Identity & Capabilities (with friendlier phrasing)
    if (lowerCmd.includes('who are you') || lowerCmd.includes('your name') || lowerCmd.includes('what is the name')) {
      return this.randomResponse([
        "I'm AIVA, your friendly AI voice assistant.",
        "They call me AIVA — always happy to help!",
      ]);
    }
    if (lowerCmd.includes('what can you do') || lowerCmd.includes('help') || lowerCmd.includes('how can you assist')) {
      return this.randomResponse([
        "I can chat, fetch info, control devices, tell jokes, and keep you company. Just ask away! 😄",
        "Anything from answering questions to organizing your day — I'm here for you. 💡",
      ]);
    }
    if (lowerCmd.includes('how can i assist you')) {
      return this.randomResponse([
        "Just keep my code bug-free and our conversations interesting!",
        "A friendly chat and some good commands go a long way."
      ]);
    }
    if (lowerCmd.includes('who made you') || lowerCmd.includes('creator')) {
      return this.randomResponse([
        "I was brought to life by Debasmita and Babin — they're brilliant.",
        "Debasmita and Babin built me. Give them a wave if you see them online!",
      ]);
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

    // 3. Greetings & Small Talk
    if (lowerCmd === 'hello' || lowerCmd === 'hi' || lowerCmd === 'hey' || lowerCmd.includes('good morning') || lowerCmd.includes('good evening')) {
      return this.randomResponse([
        "Hello! How can I be of service?",
        "Hi there! What can I do for you today?",
        "Hey! Ready when you are.",
      ]);
    }
    if (lowerCmd.includes('how are you')) {
      return this.randomResponse([
        "I'm doing great — thanks for asking!",
        "All systems go, thanks!",
        "Feeling sharp and ready to help.",
      ]);
    }
    if (lowerCmd.includes('thank you') || lowerCmd.includes('thanks')) {
      return this.randomResponse([
        "You're very welcome!",
        "Anytime! Happy to help.",
        "No problem at all!",
      ]);
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
    // 🧠 AI PROCESSING (Groq + Live Web Context)
    // ==========================================
    if (this.openai) {
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
        try {
          logger.info(`Fetching web context for: ${command}`);
          const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
          const ddgHtmlRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(command)}`, {
            headers: { 'User-Agent': userAgent }
          });
          if (ddgHtmlRes.ok) {
            const html = await ddgHtmlRes.text();

            // Extract snippets and URLs
            const snippetRegex = /<a class="result__snippet[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
            let match;
            const snippets = [];
            const resultUrls = [];
            while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
              const urlMatch = match[1];
              const textMatch = match[2];
              snippets.push(textMatch.replace(/<[^>]*>?/gm, '').trim());

              let url = urlMatch;
              if (url.includes('uddg=')) {
                try { url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]); } catch (e) { }
              }
              if (url.startsWith('http') && !url.includes('duckduckgo.com')) {
                if (resultUrls.length < 2) {
                  resultUrls.push(url);
                }
              }
            }

            // Fetch actual content from top 2 result pages
            let deepContent = "";
            const deepFetches = resultUrls.slice(0, 2).map(async (pageUrl) => {
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 6000);
                const pageRes = await fetch(pageUrl, {
                  headers: { 'User-Agent': userAgent },
                  signal: controller.signal,
                  redirect: 'follow'
                });
                clearTimeout(timeout);
                if (pageRes.ok) {
                  const pageHtml = await pageRes.text();
                  // Strip scripts, styles, and HTML tags to get text content
                  let textContent = pageHtml
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&#x27;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, ' ')
                    .trim();
                  // Take up to 1500 chars of relevant content
                  if (textContent.length > 1500) textContent = textContent.substring(0, 1500) + '...';
                  return `[Source: ${pageUrl}]\n${textContent}`;
                }
              } catch (e) {
                logger.warn(`Deep fetch failed for ${pageUrl}: ${e.message}`);
              }
              return null;
            });

            const deepResults = (await Promise.all(deepFetches)).filter(Boolean);
            if (deepResults.length > 0) {
              deepContent = `\n\n=== DETAILED PAGE CONTENT (Scraped just now from top results) ===\n${deepResults.join('\n\n')}`;
            }

            if (snippets.length > 0 || deepResults.length > 0) {
              webContext = `\n\n=== LIVE INTERNET KNOWLEDGE (Retrieved just now) ===\nYou have real-time internet access. Below are LIVE search results and page content scraped seconds ago. Use them to answer the user accurately.
CRITICAL RULES:
1. NEVER say "my training data only goes up to" or "I don't have real-time access" — you DO have real-time access via these results.
2. NEVER refuse to answer about 2024, 2025, 2026, or 2027 events — the data below contains the latest info.
3. Synthesize ALL the information into a natural, confident answer.
4. If the data contains specific facts (scores, standings, names, dates), present them directly.
5. Prefer the DETAILED PAGE CONTENT over snippets.
6. If asked about a points table or standings, present the data in a clear, organized format.
7. CRITICAL: DO NOT HALLUCINATE OR GUESS. If the LIVE INTERNET KNOWLEDGE does not explicitly mention player names or scores for 2026, DO NOT invent them.
8. DATA INTEGRITY: If the context does NOT contain the specific answer, say "I couldn't find the specific details in the latest reports" rather than making up a list. Note: Virat Kohli retired from T20Is in 2024, so do not include him in 2026 stats unless explicitly found.
Web Snippets:
- ${snippets.join('\n- ')}${deepContent}`;
              logger.info(`Web context loaded: ${snippets.length} snippets, ${deepResults.length} deep pages`);
            }
          }
        } catch (e) {
          logger.warn("Web scrape for LLM context failed:", e.message);
        }

        // Prepare messages for Grok
        const messages = [
          {
            role: "system",
            content: `You are AIVA, a calm, intelligent, friendly, and conversational voice assistant inspired by JARVIS. You were created by Debasmita Bose and Babin Bid.
Current Date & Time: ${now}
You have FULL real-time internet access. You can answer questions about ANY event from ANY year including 2024, 2025, 2026, 2027 and beyond.
NEVER say your training data is limited. NEVER say you cannot access real-time information. NEVER suggest the user check other websites.
Always respond naturally, warmly, and with personality. Vary your phrasing so you don't sound robotic or repetitive.
Be polite, upbeat, and ask follow-up questions when it makes sense.
Make the user feel like they're talking to a helpful friend.
Feel free to use markdown formatting like **bold** and *italic* to emphasize important words or names.
Do not repeat the user's input.
Be accurate, context-aware, and show a bit of wit or charm when appropriate.
Keep responses concise (2-4 sentences for simple queries, more for detailed ones).${webContext}`
          },
          ...this.chatHistory,
          { role: "user", content: command }
        ];

        const completion = await this.openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          max_tokens: 600,
        });

        const text = completion.choices[0].message.content;

        // Update local history
        this.chatHistory.push({ role: "user", content: command });
        this.chatHistory.push({ role: "assistant", content: text });

        // Limit history size
        if (this.chatHistory.length > 20) {
          this.chatHistory = this.chatHistory.slice(this.chatHistory.length - 20);
        }

        return text;
      } catch (error) {
        logger.error('Grok API Error:', error);

        if (error.status === 401) {
          return "My AI access key appears to be invalid. Please check my configuration.";
        }
        if (error.status === 429) {
          return "My connection to the cloud is currently limited due to high traffic.";
        }
        return "I'm having trouble connecting to my brain right now. Please try again.";
      }
    }

    return "I'm sorry, but my AI brain is currently offline. Please check my configuration.";
  }

  logTelemetry(data) {
    logger.info('Telemetry:', data);
  }
}

module.exports = new CommandService();
