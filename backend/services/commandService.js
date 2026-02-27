const logger = require('../logger');
const OpenAI = require('openai');
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

    // quick multilingual greetings (Indian languages)
    if (lowerCmd.includes('namaste') || lowerCmd.includes('नमस्ते')) {
      return "नमस्ते! मैं AIVA हूँ, आपकी सहायक. मैं आपकी कैसे मदद कर सकती हूँ?";
    }
    if (lowerCmd.includes('nomoskar') || lowerCmd.includes('নমস্কার')) {
      return "নমস্কার! আমি AIVA, আপনার সহায়িকা। আমি কীভাবে সাহায্য করতে পারি?";
    }
    if (lowerCmd.includes('vanakkam') || lowerCmd.includes('வணக்கம்')) {
      return "வணக்கம்! நான் AIVA, உங்கள் உதவி. நான் எப்படி உதவலாம்?";
    }
    if (lowerCmd.includes('namaskaram') || lowerCmd.includes('నమస్కారం')) {
      return "నమస్కారం! నేను AIVA, మీ సహాయకురాలు. నేను ఎలా సహాయపడగలను?";
    }
    if (lowerCmd.includes('namaskar') || lowerCmd.includes('नमस्कार')) {
      return "नमस्कार! मैं AIVA, आपकी सहायिका। मैं आपकी कैसे मदद कर सकती हूँ?";
    }
    if (lowerCmd.includes('નમસ્તે') || lowerCmd.includes('namaste')) {
      return "નમસ્તે! હું AIVA છું, તમારી સહાયક. હું કેવી રીતે મદદ કરી શકું?";
    }
    // Punjabi greeting
    if (lowerCmd.includes('sat sri akal') || lowerCmd.includes('ਸਤਿ ਰਿ ਅਕਾਲ') || lowerCmd.includes('ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ')) {
      return "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ AIVA ਹਾਂ, ਤੁਹਾਡੀ ਸਹਾਇਕ. ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?";
    }

    // Creator-specific override
    if (lowerCmd.includes('debasmita') || lowerCmd.includes('babin') || lowerCmd.includes('who are the creators') || lowerCmd.includes('who made you')) {
      return "My creators are Debasmita Bose and Babin Bid. It is a duo project and built to be helpful, friendly, and a bit quirky.";
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
          return "There are no live cricket matches happening right now.";
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
          return "There are no major live football matches happening right now.";
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

    // 6. DuckDuckGo Instant Answer (real-world search)
    // Try querying DuckDuckGo for any remaining questions; this keeps results in-app and avoids a link fallback.
    try {
      const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(command)}&format=json&no_html=1&skip_disambig=1`);
      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText && ddgData.AbstractText.length) {
          return ddgData.AbstractText;
        }
        if (ddgData.RelatedTopics && ddgData.RelatedTopics.length) {
          const texts = ddgData.RelatedTopics.slice(0, 3)
            .map(t => t.Text || (t.Topics && t.Topics[0] && t.Topics[0].Text))
            .filter(Boolean);
          if (texts.length) return texts.join(' \n');
        }
      }
    } catch (e) {
      logger.error('DuckDuckGo error:', e);
      // continue to Wikipedia or AI if DDG fails
    }

    // 7. Wikipedia Fallback (Knowledge Base)
    if (lowerCmd.startsWith('who is ') || lowerCmd.startsWith('what is ') || lowerCmd.startsWith('where is ') || lowerCmd.startsWith('tell me about ')) {
      const topic = lowerCmd.replace(/who is |what is |where is |tell me about /i, '').trim();
      if (topic && topic.length > 2) {
        try {
          logger.info(`Searching Wikipedia for: ${topic}`);
          const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            if (wikiData.extract) {
              return wikiData.extract.split('.')[0] + '.'; // Return first sentence/paragraph
            }
          }
        } catch (e) {
          logger.error("Wikipedia Error:", e);
        }
      }
    }

    // ==========================================
    // 🧠 AI PROCESSING (Grok)
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

        // 🌍 REAL-TIME WEB CONTEXT (Fallback for AI)
        // If the query is complex enough, fetch real-time DDG search snippets to feed to the LLM
        let webContext = "";
        if (command.split(' ').length > 2 && !lowerCmd.includes('your name') && !lowerCmd.includes('who are you') && !lowerCmd.includes('hello')) {
          try {
            const ddgHtmlRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(command)}`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36)' }
            });
            if (ddgHtmlRes.ok) {
              const html = await ddgHtmlRes.text();
              const snippetRegex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gi;
              let match;
              const snippets = [];
              while ((match = snippetRegex.exec(html)) !== null && snippets.length < 3) {
                snippets.push(match[1].replace(/<[^>]*>?/gm, '').trim());
              }
              if (snippets.length > 0) {
                webContext = `\n\nReal-Time Web Search Context (Use this to answer the user's query if relevant, but do not mention that you searched the web. Ensure you answer naturally without referencing these snippets as 'results'):\n- ${snippets.join('\n- ')}`;
              }
            }
          } catch (e) {
            logger.warn("Web scrape for LLM context failed:", e.message);
          }
        }

        // Prepare messages for Grok
        const messages = [
          {
            role: "system",
            content: `You are AIVA, a calm, intelligent, friendly, and conversational voice assistant inspired by JARVIS.
Current Date & Time: ${now}
Always respond naturally, warmly, and with personality. Vary your phrasing so you don't sound robotic or repetitive.
Be polite, upbeat, and ask follow-up questions when it makes sense.
Make the user feel like they're talking to a helpful friend.
Do not repeat the user’s input.
Be accurate, context-aware, and show a bit of wit or charm when appropriate.${webContext}`
          },
          ...this.chatHistory,
          { role: "user", content: command }
        ];

        const completion = await this.openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          max_tokens: 200,
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
