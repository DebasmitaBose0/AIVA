const logger = require('../logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class CommandService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initGemini();
  }

  initGemini() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Try to use a model that might work, but we handle errors gracefully
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: `You are AIVA, a calm, intelligent, human-like voice assistant inspired by JARVIS.
Respond naturally and concisely like a real assistant.
Do not repeat the user’s input.
Be accurate, polite, and context-aware.
Ask relevant follow-up questions when appropriate.`
      });
    } else {
      logger.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
    }
  }

  async processCommand(command) {
    logger.info(`Processing command: ${command}`);

    // ⚡ LOCAL FALLBACKS (Save API Quota & Latency)
    const lowerCmd = command.toLowerCase();
    if (lowerCmd.match(/what.*time/) || lowerCmd.includes('current time')) {
      return `It is ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}.`;
    }
    if (lowerCmd.match(/what.*date/) || lowerCmd.match(/what.*day/) || lowerCmd.includes('current date')) {
      return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }

    // Identity & Capabilities
    if (lowerCmd.includes('who are you') || lowerCmd.includes('your name')) {
      return "I am AIVA, your Artificial Intelligence Voice Assistant.";
    }
    if (lowerCmd.includes('what can you do') || lowerCmd.includes('help')) {
      return "I can assist you with information, control smart home devices, answer questions, and help organize your day. Just ask.";
    }
    if (lowerCmd.includes('who made you') || lowerCmd.includes('creator')) {
      return "I was created by Debasmita.";
    }

    // Greetings & Small Talk
    if (lowerCmd === 'hello' || lowerCmd === 'hi' || lowerCmd === 'hey' || lowerCmd.includes('good morning') || lowerCmd.includes('good evening')) {
      return "Hello! How can I be of service?";
    }
    if (lowerCmd.includes('how are you')) {
      return "I am functioning within normal parameters. Thank you for asking.";
    }
    if (lowerCmd.includes('thank you') || lowerCmd.includes('thanks')) {
      return "You are very welcome.";
    }
    
    // Fun / Easter Eggs
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

    // 🧮 Math Fallback
    if (lowerCmd.match(/what is \d+ [\+\-\*\/] \d+/)) {
        try {
            // Extract numbers and operator
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

    // 🌐 Wikipedia Fallback (Knowledge Base)
    if (lowerCmd.startsWith('who is ') || lowerCmd.startsWith('what is ') || lowerCmd.startsWith('tell me about ')) {
        const topic = lowerCmd.replace(/who is |what is |tell me about /i, '').trim();
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

    if (!this.model) {
      // Fallback if no API key
      return "I'm sorry, but my AI brain is currently offline. Please check my configuration.";
    }

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

      // Inject time context into the prompt so the AI knows "now"
      const prompt = `[System Context: Current Date & Time is ${now}]\nUser: ${command}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      logger.error('Gemini API Error:', error);
      
      // Handle Quota Exceeded specifically
      if (error.message && error.message.includes('429')) {
        return "My connection to the cloud is currently limited due to high traffic. I can still answer basic questions about time, date, and my system status.";
      }

      return "I encountered a glitch in my processing networks. Please try again.";
    }
  }

  logTelemetry(data) {
    logger.info('Telemetry:', data);
  }
}

module.exports = new CommandService();