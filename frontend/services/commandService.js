
import OpenAI from 'openai';

// Simple logger replacement for Vercel
const logger = {
  info: (...args) => console.log("[INFO]", ...args),
  warn: (...args) => console.warn("[WARN]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
};

class CommandService {
  constructor() {
    this.openai = null;
    this.chatHistory = []; // Store conversation history
    this.initGrok();
  }

  // helper to select a random response from an array
  randomResponse(options) {
    if (!Array.isArray(options) || options.length === 0) return '';
    return options[Math.floor(Math.random() * options.length)];
  }

  initGrok() {
    // DuckDuckGo fallback is used; Grok/OpenAI no longer needed.
    logger.info('Using DuckDuckGo for external queries; AI features disabled.');
    this.openai = null;
  }

  async processCommand(command) {
    const lowerCmd = command.toLowerCase();

    // Creator-specific override
    if (lowerCmd.includes('debasmita') || lowerCmd.includes('babin') || lowerCmd.includes('who are the creators') || lowerCmd.includes('who made you')) {
      return "My creators are Debasmita Bose and Babin Bid. It is a duo project and built to be helpful, friendly, and a bit quirky.";
    }

    // Name response
    if (
      lowerCmd.includes('what is your name') ||
      lowerCmd.includes('your name') ||
      lowerCmd.match(/who are you/) ||
      lowerCmd.match(/who.*are you/)
    ) {
      return "I am AIVA, your Artificial Intelligence Voice Assistant.";
    }

    // Language understanding response
    if (
      lowerCmd.includes('what language can you understand') ||
      lowerCmd.includes('which languages can you understand') ||
      lowerCmd.includes('what languages do you understand') ||
      lowerCmd.includes('which language do you understand') ||
      (lowerCmd.includes('can you understand') && lowerCmd.includes('language'))
    ) {
      return "I can understand and respond in many languages, including English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, and more!";
    }
    // Fallback for any other language: auto-detect and respond
    // If not matched by above, use Grok AI to reply in user's language
    // If Grok is not available, reply in English with a friendly message
    // Friendly greeting in Indian languages
    // Hindi
    if (lowerCmd.includes('namaste') || lowerCmd.includes('नमस्ते')) {
      return "नमस्ते! यह वेबसाइट AIVA है, जिसे Debasmita Bose और Babin Bid ने बनाया है। आपकी कैसे मदद कर सकती हूँ?";
    }
    // Bengali
    if (lowerCmd.includes('nomoskar') || lowerCmd.includes('নমস্কার')) {
      return "নমস্কার! এই ওয়েবসাইটটি AIVA, Debasmita Bose এবং Babin Bid দ্বারা নির্মিত। আমি কিভাবে সাহায্য করতে পারি?";
    }
    // Tamil
    if (lowerCmd.includes('vanakkam') || lowerCmd.includes('வணக்கம்')) {
      return "வணக்கம்! இந்த இணையதளம் AIVA, Debasmita Bose மற்றும் Babin Bid உருவாக்கியது. நான் எப்படி உதவலாம்?";
    }
    // Telugu
    if (lowerCmd.includes('namaskaram') || lowerCmd.includes('నమస్కారం')) {
      return "నమస్కారం! ఈ వెబ్‌సైట్ AIVA, Debasmita Bose మరియు Babin Bid రూపొందించింది. నేను ఎలా సహాయపడగలను?";
    }
    // Marathi
    if (lowerCmd.includes('namaskar') || lowerCmd.includes('नमस्कार')) {
      return "नमस्कार! ही वेबसाइट AIVA, Debasmita Bose आणि Babin Bid यांनी तयार केली आहे. मी कशी मदत करू?";
    }
    // Gujarati
    if (lowerCmd.includes('namaste') || lowerCmd.includes('નમસ્તે')) {
      return "નમસ્તે! આ વેબસાઇટ AIVA, Debasmita Bose અને Babin Bid દ્વારા બનાવવામાં આવી છે. હું કેવી રીતે મદદ કરી શકું?";
    }
    // Kannada
    if (lowerCmd.includes('namaskara') || lowerCmd.includes('ನಮಸ್ಕಾರ')) {
      return "ನಮಸ್ಕಾರ! ಈ ವೆಬ್‌ಸೈಟ್ AIVA, Debasmita Bose ಮತ್ತು Babin Bid ರಚಿಸಿದ್ದಾರೆ. ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?";
    }
    // Malayalam
    if (lowerCmd.includes('namaskaram') || lowerCmd.includes('നമസ്കാരം')) {
      return "നമസ്കാരം! ഈ വെബ്സൈറ്റ് AIVA, Debasmita Bose ഒപ്പം Babin Bid സൃഷ്ടിച്ചത്. ഞാൻ എങ്ങനെ സഹായിക്കാം?";
    }
    logger.info(`Processing command: ${command}`);

    // ==========================================
    // ⚡ LOCAL FALLBACKS (Fast & Free)
    // ==========================================

    // 1. Time & Date (with varied responses)
    // timezone-specific request (IANA name)
    const tzMatch = lowerCmd.match(/time in ([A-Za-z_\/\-]+)/);
    if (tzMatch) {
      const tz = tzMatch[1];
      try {
        const tzRes = await fetch(`http://worldtimeapi.org/api/timezone/${encodeURIComponent(tz)}`);
        if (tzRes.ok) {
          const tzData = await tzRes.json();
          if (tzData.datetime) {
            const date = new Date(tzData.datetime);
            return `The current time in ${tz} is ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}.`;
          }
        }
        return `I couldn't fetch the time for ${tz}. Please check the timezone name.`;
      } catch (e) {
        logger.error('Timezone fetch error:', e);
        return `There was an error looking up the timezone ${tz}.`;
      }
    }
    // Exclude "temperature" or "weather" queries from matching "day" or "date"
    const isWeatherQuery = lowerCmd.includes('temperature') || lowerCmd.includes('weather');

    if (
      !isWeatherQuery && (
        lowerCmd.match(/what.*time/) ||
        lowerCmd.includes('current time') ||
        lowerCmd.match(/what is the time( now)?/) ||
        lowerCmd.match(/what is your time/) ||
        lowerCmd.match(/hey.*what.*time/) ||
        lowerCmd.match(/time now/) ||
        lowerCmd.match(/what's the time/) ||
        lowerCmd.match(/tell me the time/) ||
        lowerCmd.match(/your time/) ||
        lowerCmd.match(/can you tell.*time/)
      )
    ) {
      return this.randomResponse([
        `It is ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}.`,
        `Right now it's ${new Date().toLocaleTimeString()}.`,
      ]);
    }
    if (!isWeatherQuery && (lowerCmd.match(/what.*date/) || lowerCmd.match(/what.*day/) || lowerCmd.includes('current date'))) {
      return this.randomResponse([
        `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
        `It's ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      ]);
    }

    // 🌤️ Weather Fallback (wttr.in with retry and alternative)
    if (lowerCmd.includes('temperature') || lowerCmd.includes('weather')) {
      try {
        let city = '';
        const cityMatch = lowerCmd.match(/in ([a-zA-Z\s]+)/);
        if (cityMatch && cityMatch[1]) {
          city = cityMatch[1].replace('today', '').trim();
        }
        const candidates = city ? [city, city.split(/[ ,]+/)[0]] : [''];

        const tryWttr = async (q) => {
          const url = q ? `https://wttr.in/${encodeURIComponent(q)}?format=%t+%C` : `https://wttr.in/?format=%t+%C`;
          logger.info(`Fetching weather from: ${url}`);
          try {
            const res = await fetch(url, { timeout: 10000 });
            if (res.ok) {
              const text = (await res.text()).trim();
              if (text && text.length < 50 && !text.toLowerCase().includes('unknown')) return text;
            }
          } catch (err) {
            logger.warn('wttr fetch error', err.message || err);
          }
          return null;
        };

        for (const q of candidates) {
          const text = await tryWttr(q);
          if (text) return `The current condition ${q ? 'in ' + q : ''} is ${text}.`;
        }

        // fallback open-meteo
        if (city) {
          try {
            const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
            if (geo.ok) {
              const data = await geo.json();
              if (data.results && data.results.length) {
                const { latitude, longitude, name } = data.results[0];
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                if (weatherRes.ok) {
                  const w = await weatherRes.json();
                  if (w.current_weather) {
                    const temp = w.current_weather.temperature;
                    const code = w.current_weather.weathercode;
                    const map = { 0: 'clear', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast' };
                    return `Right now in ${name} it's ${temp}°C with ${map[code] || 'some conditions'}.`;
                  }
                }
              }
            }
          } catch (_) { }
        }

        return `Sorry, I couldn't fetch the weather for ${city || 'your location'} right now.`;
      } catch (err) {
        logger.error("Weather Error:", err);
        return "I'm having trouble getting the weather at the moment. Please try again later.";
      }
    }

    // 2. Identity & Capabilities
    if (lowerCmd.includes('who are you') || lowerCmd.includes('your name') || lowerCmd.includes('what is the name')) {
      return this.randomResponse([
        "I'm AIVA, your friendly AI voice assistant 😊.",
        "They call me AIVA — happy to chat anytime! 🤖",
      ]);
    }
    if (lowerCmd.includes('what can you do') || lowerCmd.includes('help') || lowerCmd.includes('how can you assist')) {
      return this.randomResponse([
        "I can fetch info, answer questions, control devices, and keep you company. Just ask! 😄",
        "From telling jokes to organizing your day — I'm here for you. 💡",
      ]);
    }
    if (lowerCmd.includes('how can i assist you')) {
      return this.randomResponse([
        "A kind word and a clear command go a long way!",
        "You can help by keeping me busy with fun questions."
      ]);
    }
    if (
      lowerCmd.includes('who made you') ||
      lowerCmd.includes('creator') ||
      lowerCmd.match(/(who.*(developed|built|made|created).*aiva)|(aiva.*author)|(aiva.*creator)|(site.*author)|(site.*creator)|(site.*made.*by)/i)
    ) {
      return this.randomResponse([
        "This website, AIVA, was created by the duo of Debasmita Bose and Babin Bid.",
        "Debasmita and Babin built me. Give them a shout if you like!",
      ]);
    }
    if (lowerCmd.includes('change your voice') && (lowerCmd.includes('can you') || lowerCmd.includes('will you') || lowerCmd.includes('if i tell you'))) {
      return "Sure — just say 'change voice to' plus the name and I'll switch tones.";
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
        "Hi there! What can I do for you?",
        "Hey! I'm here whenever you need me.",
      ]);
    }
    if (lowerCmd.includes('how are you')) {
      return this.randomResponse([
        "I'm doing great, thanks for checking in!",
        "All systems are go!",
        "Feeling sharp and ready to help.",
      ]);
    }
    if (lowerCmd.includes('thank you') || lowerCmd.includes('thanks')) {
      return this.randomResponse([
        "You're very welcome!",
        "Anytime! Glad to assist.",
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
    if (lowerCmd.match(/^(search|look up|find) (for )?(.+)/)) {
      const query = lowerCmd.replace(/^(search|look up|find) (for )?/, '').trim();
      if (query) {
        try {
          const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
          if (ddgRes.ok) {
            const ddgData = await ddgRes.json();
            if (ddgData.AbstractText && ddgData.AbstractText.length) {
              return ddgData.AbstractText;
            }
            if (ddgData.RelatedTopics && ddgData.RelatedTopics.length) {
              // assemble up to three related topic texts
              const texts = ddgData.RelatedTopics
                .slice(0, 3)
                .map(t => t.Text || (t.Topics && t.Topics[0] && t.Topics[0].Text))
                .filter(Boolean);
              if (texts.length) {
                return texts.join(" \n");
              }
            }
            // nothing useful, give a generic apology instead of linking
            return `Sorry, I couldn’t find a concise answer for "${query}".`;
          }
        } catch (e) {
          logger.error('DuckDuckGo Error:', e);
          return `There was an error searching DuckDuckGo.`;
        }
      }
    }

    // ==========================================
    // ⚡ LOCAL FALLBACKS (Fast & Free) CONTINUED
    // ==========================================

    // universal fallback: use DuckDuckGo instant answer for anything not handled above
    if (!(
      lowerCmd.includes('namaste') || lowerCmd.includes('नमस्ते') ||
      lowerCmd.includes('nomoskar') || lowerCmd.includes('নমস্কার') ||
      lowerCmd.includes('vanakkam') || lowerCmd.includes('வணக்கம்') ||
      lowerCmd.includes('namaskaram') || lowerCmd.includes('నమస్కారం') || lowerCmd.includes('namaskar') || lowerCmd.includes('नमस्कार') ||
      lowerCmd.includes('નમસ્તे') || lowerCmd.includes('namaskara') || lowerCmd.includes('ನಮಸ್ಕಾರ') || lowerCmd.includes('നമസ്കാരം')
    )) {
      try {
        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(command)}&format=json&no_html=1&skip_disambig=1`);
        if (ddgRes.ok) {
          const ddgData = await ddgRes.json();
          if (ddgData.AbstractText && ddgData.AbstractText.length) {
            return ddgData.AbstractText;
          }
          if (ddgData.RelatedTopics && ddgData.RelatedTopics.length) {
            // try to collect a few related texts
            const texts = ddgData.RelatedTopics.slice(0, 3).map(t => t.Text || (t.Topics && t.Topics[0] && t.Topics[0].Text)).filter(Boolean);
            if (texts.length) return texts.join(' \n');
          }
        }
      } catch (e) {
        logger.error('DuckDuckGo error:', e);
      }
      // fallback: provide suggestion or search link
      if (command.trim().toLowerCase().match(/^tell me( some)? info/)) {
        return "Could you please specify the topic you want information about?";
      }
      return `Sorry, I couldn’t find a concise answer to that.`;
    }

    // ==========================================
    // 🧠 AI PROCESSING (Grok for deeper queries)
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

        // Prepare messages for Grok
        const messages = [
          {
            role: "system",
            content: `You are AIVA, a calm, intelligent, friendly, conversational voice assistant inspired by JARVIS.
Current Date & Time: ${now}
Speak warmly and vary your phrasing so you feel like a helpful companion instead of a robot.
Be polite, witty when appropriate, and ask follow-up questions to keep the conversation natural.
Do not repeat the user’s input. Be accurate, context-aware, and show personality.`
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
          return "Sorry, AIVA is having trouble with its AI access key. Please contact support or try again later.";
        }
        if (error.status === 429) {
          return "Sorry, AIVA is experiencing high traffic and can't respond right now. Please try again in a few moments.";
        }
        return "Sorry, something went wrong while processing your request. Please try again soon or contact support if the issue persists.";
      }
    }

    return "I'm sorry, but my AI brain is currently offline. Please check my configuration.";
  }
}

// Singleton instance
const commandService = new CommandService();
export default commandService;
