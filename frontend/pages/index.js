import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import JarvisLoader from "../components/JarvisLoader";
import {
  Mic, MicOff, Bot, User, Copy, Trash2, Clock, Calendar,
  CloudSun, Laugh, HelpCircle, Volume2, Globe, Cpu, Zap,
  MessageSquare, Activity, Shield, Radio, Send, Monitor,
  Battery, AppWindow
} from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function Home() {
  const [status, setStatus] = useState("System Offline");
  const [lastCommand, setLastCommand] = useState("");
  const [response, setResponse] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [animatingMsgId, setAnimatingMsgId] = useState(null);
  const [animatedText, setAnimatedText] = useState("");
  const animatingRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [missingLangs, setMissingLangs] = useState([]);
  const [systemStarted, setSystemStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startIconIndex, setStartIconIndex] = useState(0);
  const startIcons = [Shield, Mic, Radio, Activity, Globe];
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isTextMode, setIsTextMode] = useState(false);

  const languageNames = {
    en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
    mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu'
  };

  const voiceRef = useRef(null);
  const voicesRef = useRef([]);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptRef = useRef("");
  const lastUserCommand = useRef("");
  const lastUserTime = useRef(0);

  // Scroll chat to bottom
  useEffect(() => {
    const el = document.getElementById('chat-end');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const copyChat = () => {
    if (chatHistory.length === 0) return;
    const text = chatHistory.map(m => `[${m.time}] ${m.type === 'user' ? 'You' : 'AIVA'}: ${m.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setStatus('Copied');
      setTimeout(() => setStatus('System Online'), 2000);
    }).catch(() => { });
  };

  const clearChat = () => {
    setChatHistory([]);
    setResponse('');
    setStatus('Cleared');
    setTimeout(() => setStatus('System Online'), 2000);
  };

  // Add message — strict dedup
  const addMessage = (type, text) => {
    const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const id = Date.now() + Math.random();
    setChatHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.type === type && last.text === text) return prev;
      return [...prev, { type, text, time, id }];
    });
    if (type === 'bot') {
      setResponse(text);
      // Start typewriter animation for bot messages
      animateMessage(id, text);
    }
  };

  // Copilot-style animated text reveal using native GPU Cascading CSS delays
  const animateMessage = (msgId, fullText) => {
    setAnimatingMsgId(msgId);
    setAnimatedText(fullText);
    animatingRef.current = true;
    const wordsCount = fullText.split(/\s+/).length;
    setTimeout(() => {
      setAnimatingMsgId(null);
      setAnimatedText("");
      animatingRef.current = false;
    }, wordsCount * 40 + 1500); // Match CSS staggered completion time
  };

  useEffect(() => { voicesRef.current = voices; }, [voices]);

  // Handle start overlays rotating icons
  useEffect(() => {
    if (!isLoading && !systemStarted) {
      const iconInterval = setInterval(() => {
        setStartIconIndex(prev => (prev + 1) % startIcons.length);
      }, 1500);

      return () => {
        clearInterval(iconInterval);
      };
    }
  }, [isLoading, systemStarted, startIcons.length]);
  useEffect(() => {
    voiceRef.current = selectedVoice;
    if (recognitionRef.current && selectedVoice) {
      recognitionRef.current.lang = selectedVoice.lang;
    }
  }, [selectedVoice]);

  // Setup Speech Recognition & Voices
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const filtered = all.filter(v => {
        const l = v.lang.toLowerCase();
        // Support English and all major Indian regional languages
        if (
          l.startsWith('en') || l.startsWith('hi') || l.startsWith('bn') ||
          l.startsWith('ta') || l.startsWith('te') || l.startsWith('mr') ||
          l.startsWith('gu') || l.startsWith('kn') || l.startsWith('ml') ||
          l.startsWith('pa') || l.startsWith('ur')
        ) {
          return true;
        }
        return false;
      });

      const sorted = filtered.sort((a, b) => {
        const ai = a.lang.toLowerCase().includes('in');
        const bi = b.lang.toLowerCase().includes('in');
        if (ai && !bi) return -1;
        if (!ai && bi) return 1;
        return 0;
      });

      setVoices(sorted);

      const codes = Object.keys(languageNames).filter(c => c !== 'en');
      const missing = codes.filter(c =>
        !sorted.some(v => v.lang.toLowerCase().startsWith(c) && v.lang.toLowerCase().includes('in'))
      ).map(c => languageNames[c] || c);
      setMissingLangs(missing);

      const pref = sorted.find(v =>
        v.lang.startsWith('bn') || // Priority to Bengali
        v.name.includes("Google US English") ||
        v.name.includes("Microsoft Zira") ||
        v.name.includes("Samantha")
      ) || sorted[0];
      if (pref) setSelectedVoice(pref);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;

      // Defaulting to en-IN gives us the highest level of bilingual 
      // English + Indian language recognition without manually switching.
      rec.lang = "en-IN";

      rec.onstart = () => {
        setIsListening(true);
        setStatus("Listening...");
        setLiveTranscript("");
        transcriptRef.current = "";
      };

      rec.onresult = (event) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalTrans += event.results[i][0].transcript;
          else interimTrans += event.results[i][0].transcript;
        }
        const text = (finalTrans + interimTrans).trim();
        setLiveTranscript(text);
        transcriptRef.current = text;

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          rec.stop();
        }, 2500); // 2.5 seconds of silence = user is done
      };

      rec.onend = () => {
        setIsListening(false);
        const cmd = transcriptRef.current;
        if (cmd) {
          setLastCommand(cmd);
          setStatus("Processing...");
          setIsProcessing(true);
          processCommand(cmd);
        }
        setLiveTranscript("");
        transcriptRef.current = "";
      };

      rec.onerror = () => {
        setStatus("System Online");
        setIsListening(false);
      };

      recognitionRef.current = rec;
      setRecognition(rec);
    } else {
      setIsSupported(false);
      setStatus("Voice Not Supported");
    }

    // Stop speaking if the user refreshes or closes the page
    const handleBeforeUnload = () => window.speechSynthesis.cancel();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.speechSynthesis.cancel();
    };
  }, []);


  const initializeSystem = () => {
    setSystemStarted(true);
    setStatus("System Online");
    const all = window.speechSynthesis.getVoices();
    if (all.length > 0 && !selectedVoice) setSelectedVoice(all[0]);

    const isBengali = selectedVoice?.lang.startsWith('bn');
    const greetingText = isBengali
      ? "নমস্কার! আমি আইভা। আমি আপনাকে কীভাবে সাহায্য করতে পারি?"
      : "Hi! I am AIVA, made by Debasmita and Babin. How can I assist you?";

    speakResponse(greetingText);
    addMessage('bot', isBengali
      ? "নমস্কার! আমি আইভা — আপনার এআই ভয়েস অ্যাসিস্ট্যান্ট। শুরু করতে মাইকে ট্যাপ করুন বা নিচের পরামর্শগুলো দেখুন।"
      : "Ready to assist you. Tap the mic below or pick a suggestion to start.");
  };

  // Audio
  const audioContextRef = useRef(null);

  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playSound = (type) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    const t = audioContextRef.current.currentTime;
    if (type === 'start') {
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
    } else {
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.1);
    }
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(); osc.stop(t + 0.1);
  };

  // Toggle mic — one button to start/stop
  const toggleMic = async () => {
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
      setIsListening(false);
      // Let onend handle the submission if transcript exists
      return;
    }
    await initAudio();
    playSound('start');
    setStatus("Listening...");
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error("Mic start error:", e);
    }
  };

  // Dedup guard
  const processCommand = async (command) => {
    const now = Date.now();
    if (command === lastUserCommand.current && now - lastUserTime.current < 1500) return;
    lastUserCommand.current = command;
    lastUserTime.current = now;

    // Intelligent frontend auto-punctuation for voice/text inputs
    let punctuatedCommand = command.trim();
    if (!/[.!?]$/.test(punctuatedCommand)) {
      const questionWords = ['what', 'when', 'where', 'who', 'whom', 'which', 'whose', 'why', 'how', 'is', 'are', 'do', 'does', 'did', 'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might'];
      const exclamatoryWords = ['wow', 'amazing', 'great', 'awesome', 'terrible', 'horrible', 'damn', 'fuck', 'shit', 'omg', 'yay', 'hurray', 'gosh', 'insane', 'crazy', 'unbelievable', 'wtf'];

      const firstWord = punctuatedCommand.split(' ')[0].toLowerCase();

      const isQuestion = questionWords.includes(firstWord);
      const isExclamatory = exclamatoryWords.some(w => punctuatedCommand.toLowerCase().includes(w));

      if (isQuestion && isExclamatory) {
        punctuatedCommand += '?!';
      } else if (isQuestion) {
        punctuatedCommand += '?';
      } else if (isExclamatory) {
        punctuatedCommand += '!';
      } else {
        punctuatedCommand += '.';
      }
    }

    addMessage('user', punctuatedCommand);

    const lower = command.toLowerCase();

    // Mode Switching
    if (lower.includes('enable type mode') || lower.includes('open type mode') || lower.includes('enable text mode') || lower.includes('open text mode') || lower.includes('type mode') || lower.includes('text mode')) {
      setIsTextMode(true);
      finishResponse("Text mode enabled. You can now type your commands.");
      return;
    }
    if (lower.includes('enable voice mode') || lower.includes('open voice mode') || lower.includes('enable speak mode') || lower.includes('open speak mode') || lower.includes('voice mode') || lower.includes('speak mode')) {
      setIsTextMode(false);
      finishResponse("Voice mode enabled. I am listening.");
      return;
    }

    // Client-side time/date (Guarded to not steal news/weather queries)
    const isSpecial = lower.includes('news') || lower.includes('headlines') || lower.includes('weather') || lower.includes('cricket') || lower.includes('score') || lower.includes('match') || lower.includes('sport');

    if (!isSpecial) {
      if (lower.match(/what.*time/) || lower.includes('current time') || lower.match(/time now/)) {
        const t = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric', hour12: true });
        const msg = `It is ${t}.`;
        finishResponse(msg);
        return;
      }
      if (lower.match(/what.*date/) || lower.match(/what.*day/) || lower.includes('current date')) {
        const d = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        finishResponse(`Today is ${d}.`);
        return;
      }
    }

    // Send to backend with strict 45s timeout to allow Groq fallback breathing room
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ command: punctuatedCommand }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let data;
      try { data = await res.json(); } catch { data = null; }

      if (res.ok && data) {
        // Voice change action
        if (data.action === 'CHANGE_VOICE' && data.voiceName) {
          const found = voicesRef.current.find(v => v.name.toLowerCase().includes(data.voiceName.toLowerCase()));
          if (found) { setSelectedVoice(found); voiceRef.current = found; }
          else { data.response += ` (Voice "${data.voiceName}" not found.)`; }
        }

        // Auto-detect language
        const detectLang = (text) => {
          if (/\p{Script=Devanagari}/u.test(text)) return 'hi';
          if (/\p{Script=Bengali}/u.test(text)) return 'bn';
          if (/\p{Script=Tamil}/u.test(text)) return 'ta';
          if (/\p{Script=Telugu}/u.test(text)) return 'te';
          if (/\p{Script=Kannada}/u.test(text)) return 'kn';
          if (/\p{Script=Malayalam}/u.test(text)) return 'ml';
          if (/\p{Script=Gujarati}/u.test(text)) return 'gu';
          if (/\p{Script=Gurmukhi}/u.test(text)) return 'pa';
          return null;
        };
        const lc = detectLang(data.response);
        if (lc) {
          let mv = voices.find(v => v.lang.toLowerCase().startsWith(lc) && v.lang.toLowerCase().includes('in'))
            || voices.find(v => v.lang.toLowerCase().startsWith(lc));
          if (mv && mv.name !== selectedVoice?.name) { setSelectedVoice(mv); voiceRef.current = mv; }
        }

        // Handle Redirects
        if (data.action === 'REDIRECT' && data.url) {
          window.open(data.url, '_blank');
        }

        finishResponse(data.response);
      } else {
        finishResponse("Error processing command.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      finishResponse("Network error. Please check your connection.");
    }
  };

  // Unified response handler
  const finishResponse = (text) => {
    setResponse(text);
    addMessage('bot', text);
    speakResponse(text);
    setStatus("System Online");
    setIsProcessing(false);
    playSound('end');
  };

  const sendQuickCommand = (cmd) => {
    if (isProcessing) return;
    setLastCommand(cmd);
    setStatus("Processing...");
    setIsProcessing(true);
    processCommand(cmd);
  };

  const speakResponse = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    // Clean up Markdown symbols so the TTS doesn't say "asterisk" or "hash"
    // Also remove emojis so it doesn't try to spell "smiling face with sunglasses"
    let cleanedText = text.replace(/[*#_`~[\]=+\-]/g, '').trim();
    cleanedText = cleanedText.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    cleanedText = cleanedText.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols and Pictographs
    cleanedText = cleanedText.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport and Map
    cleanedText = cleanedText.replace(/[\u{1F700}-\u{1F77F}]/gu, ''); // Alchemical Symbols
    cleanedText = cleanedText.replace(/[\u{1F780}-\u{1F7FF}]/gu, ''); // Geometric Shapes Extended
    cleanedText = cleanedText.replace(/[\u{1F800}-\u{1F8FF}]/gu, ''); // Supplemental Arrows-C
    cleanedText = cleanedText.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols and Pictographs
    cleanedText = cleanedText.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Chess Symbols
    cleanedText = cleanedText.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Symbols and Pictographs Extended-A
    cleanedText = cleanedText.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
    cleanedText = cleanedText.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats

    const u = new SpeechSynthesisUtterance(cleanedText);

    // Auto-detect language for better voice selection
    const isBengali = /[\u0980-\u09FF]/.test(cleanedText);
    const isHindi = /[\u0900-\u097F]/.test(cleanedText);

    let targetVoice = voiceRef.current;

    // If the text is Bengali/Hindi but the selected voice is English, find a matching voice
    if ((isBengali || isHindi) && (!targetVoice || !targetVoice.lang.startsWith('bn') && !targetVoice.lang.startsWith('hi'))) {
      const all = window.speechSynthesis.getVoices();
      const langCode = isBengali ? 'bn' : 'hi';
      targetVoice = all.find(v => v.lang.startsWith(langCode)) || targetVoice;
    }

    if (targetVoice) u.voice = targetVoice;
    else {
      const all = window.speechSynthesis.getVoices();
      if (all.length > 0) u.voice = all[0];
    }

    u.rate = 1.0; u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  };

  const handleVoiceChange = (e) => {
    const val = e.target.value;
    if (val.startsWith('lang:')) {
      const prefix = val.slice(5);
      let found = voices.find(v => v.lang.toLowerCase().startsWith(prefix) && v.lang.toLowerCase().includes('in'))
        || voices.find(v => v.lang.toLowerCase().startsWith(prefix));
      if (found) {
        setSelectedVoice(found);
        voiceRef.current = found;
        // feedback via status bar rather than speech to avoid
        // mispronunciations (some voices say "tarankan" repeatedly)
        setStatus(`Voice changed to ${languageNames[prefix] || prefix}`);
        playSound('start');
      }
    } else {
      const voice = voices.find(v => v.name === val);
      if (voice) {
        setSelectedVoice(voice);
        voiceRef.current = voice;
        setStatus(`Voice changed to ${voice.name}`);
        playSound('start');
      }
    }
  };

  const features = [
    { icon: Mic, title: "Voice Control", desc: "Natural speech input" },
    { icon: Globe, title: "Smart Search", desc: "Real-time web browsing" },
    { icon: CloudSun, title: "Live Weather", desc: "City-level accuracy" },
    { icon: Cpu, title: "AI Powered", desc: "Dual Gemini + Groq" },
  ];

  const suggestions = [
    { icon: Clock, label: "What is the time?", cmd: "What is the time?" },
    { icon: Laugh, label: "Tell me a joke", cmd: "Tell me a joke" },
    { icon: Globe, label: "What is the news today?", cmd: "What is the news today?" },
    { icon: Mic, label: "Who are you?", cmd: "Who are you?" },
  ];

  // Format basic markdown (bold and italic) and inject CSS Wave
  const formatText = (text, isAnimating = false) => {
    if (!text) return { __html: "" };
    let parsed = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Inject natively cascading staggered delays onto words for the Copilot eye-catching blur wave
    if (isAnimating) {
      let wordIndex = 0;
      parsed = parsed.split(/(\*\*.*?\*\*|\*.*?\*|\n)/g).map(part => {
        if (!part) return '';
        if (part === '\n') return '<br/>';
        if (part.startsWith('**') && part.endsWith('**')) {
          let inner = part.slice(2, -2).split(' ').map(w => `<span class="typing-blur-word" style="animation-delay: ${(wordIndex++) * 0.04}s">${w}</span>`).join(' ');
          return `<strong>${inner}</strong>`;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          let inner = part.slice(1, -1).split(' ').map(w => `<span class="typing-blur-word" style="animation-delay: ${(wordIndex++) * 0.04}s">${w}</span>`).join(' ');
          return `<em>${inner}</em>`;
        }
        return part.split(' ').map(w => {
          if (!w.trim()) return w;
          return `<span class="typing-blur-word" style="animation-delay: ${(wordIndex++) * 0.04}s">${w}</span>`;
        }).join(' ');
      }).join('');
    } else {
      parsed = parsed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
    }

    return { __html: parsed };
  };

  return (
    <div className="app-layout">
      <Head>
        <title>AIVA — AI Voice Assistant</title>
        <meta name="description" content="AIVA: AI voice assistant with multilingual support, live weather, and conversational AI." />
        <link rel="icon" href="/aiva_favicon.png" />
      </Head>

      {isLoading && <JarvisLoader onFinish={() => setIsLoading(false)} />}

      {!isLoading && (
        <>
          {/* START OVERLAY */}
          {!systemStarted && (
            <div className="start-overlay">

              <div className="start-content">
                <div className="start-icon-container">
                  {startIcons.map((Icon, idx) => (
                    <Icon
                      key={idx}
                      size={48}
                      className={`start-shield start-transition-icon ${idx === startIconIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
                <h2 className="start-title">AIVA</h2>
                <p className="start-sub">Artificially Intelligent Voice Assistant</p>
                <button className="start-btn" id="start-btn" onClick={initializeSystem}>
                  <Zap size={18} /> INITIALIZE
                </button>
              </div>
            </div>
          )}

          {/* NAVBAR */}
          <nav className="navbar" id="navbar">
            <div className="navbar-brand">
              <div className="logo-icon"><Shield size={16} /></div>
              <h1>AIVA</h1>
            </div>
            <div className="navbar-center">
              <Activity size={14} className={systemStarted ? 'status-icon-online' : 'status-icon-offline'} />
              <span>{status}</span>
            </div>
            <div className="navbar-right">
              <Volume2 size={14} className="voice-icon" />
              <select className="navbar-voice-select" id="voice-selector" onChange={handleVoiceChange} value={selectedVoice?.name || ""}>
                {voices.length === 0 && <option>Loading...</option>}
                <option disabled>── Languages ──</option>
                {Object.keys(languageNames)
                  .filter(c => voices.some(v => v.lang.toLowerCase().startsWith(c)))
                  .map(c => (
                    <option key={c} value={`lang:${c}`}>{languageNames[c]}</option>
                  ))}
                <option disabled>── All Voices ──</option>
                {(() => {
                  const g = {};
                  voices.forEach(v => { const c = v.lang.split('-')[0]; if (!g[c]) g[c] = []; g[c].push(v); });
                  return Object.entries(g).map(([c, list]) => (
                    <optgroup key={c} label={languageNames[c] || c}>
                      {list.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                    </optgroup>
                  ));
                })()}
              </select>
            </div>
          </nav>

          {/* FEATURES ROW */}
          <div className="features-row" id="features">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div className="feature-chip" key={i} onClick={f.action} style={f.action ? { cursor: 'pointer' } : {}}>
                  <Icon size={20} className="chip-icon" />
                  <div className="chip-text">
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CHAT SECTION — full height with input bar */}
          <section className="chat-section" id="chat">
            <div className="chat-header">
              <div className="chat-header-left">
                <MessageSquare size={16} className="chat-icon-pulse" />
                <span className="chat-title">Conversation</span>
              </div>
              <div className="chat-tools">
                <button onClick={copyChat}><Copy size={12} /> Copy</button>
                <button onClick={clearChat}><Trash2 size={12} /> Clear</button>
              </div>
            </div>

            <div className="chat-messages" id="chat-messages">
              {chatHistory.length === 0 && (
                <div className="chat-empty">
                  <MessageSquare size={40} className="empty-icon" />
                  <h3>Ready to assist you</h3>
                  <p>Tap the mic below or pick a suggestion to start.</p>
                  <div className="chat-suggestions">
                    {suggestions.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <button className="suggestion-chip" key={i} onClick={() => sendQuickCommand(s.cmd)}>
                          <Icon size={14} /> {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, i) => {
                const isAnimating = msg.id === animatingMsgId;
                const displayText = isAnimating ? animatedText : msg.text;
                return (
                  <div key={msg.id || i} className={`chat-msg ${msg.type} ${isAnimating ? 'animating' : ''}`}>
                    {msg.type === 'bot' && <div className={`avatar ${isAnimating || isProcessing ? 'avatar-active' : ''}`}><Bot size={16} /></div>}
                    <div className="bubble">
                      {msg.type === 'bot' ? (
                        <p className={isAnimating ? 'typewriter-text' : ''} dangerouslySetInnerHTML={formatText(displayText, isAnimating)} />
                      ) : (
                        <p dangerouslySetInnerHTML={formatText(msg.text, false)} />
                      )}
                      <div className="msg-actions">
                        <button className="copy-msg-btn" onClick={() => navigator.clipboard.writeText(msg.text)} title="Copy message"><Copy size={12} /></button>
                        <div className="timestamp">{msg.time}</div>
                      </div>
                    </div>
                    {msg.type === 'user' && <div className={`avatar ${isProcessing && i === chatHistory.length - 1 ? 'avatar-active' : ''}`}><User size={16} /></div>}
                  </div>
                );
              })}



              {isProcessing && (
                <div className="chat-msg bot">
                  <div className="avatar"><Bot size={16} /></div>
                  <div className="bubble">
                    <div className="thinking-wave">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                  </div>
                </div>
              )}

              <div id="chat-end" />
            </div>

            {/* INPUT BAR */}
            <div className="chat-input-bar">
              {!isTextMode ? (
                <>
                  <button
                    className={`mic-btn ${isListening ? 'listening' : ''}`}
                    id="mic-btn"
                    onClick={toggleMic}
                    disabled={!isSupported || isProcessing}
                  >
                    {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>
                  <span className={`status-label ${isListening ? 'active' : ''}`} onClick={() => setIsTextMode(true)}>
                    {isListening ? (liveTranscript || 'Listening — speak now...') :
                      isProcessing ? 'Processing your request...' :
                        'Tap the mic to speak or click here to type'}
                  </span>
                </>
              ) : (
                <>
                  <button className="mode-toggle-btn" onClick={() => setIsTextMode(false)} title="Switch to Voice Mode">
                    <Mic size={18} />
                  </button>
                  <input
                    type="text"
                    className="text-mode-input"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textInput.trim()) {
                        sendQuickCommand(textInput);
                        setTextInput("");
                      }
                    }}
                    placeholder="Type your message here..."
                    disabled={isProcessing}
                    autoFocus
                  />
                  <button
                    className="send-btn"
                    disabled={!textInput.trim() || isProcessing}
                    onClick={() => {
                      sendQuickCommand(textInput);
                      setTextInput("");
                    }}
                  >
                    <Send size={18} />
                  </button>
                </>
              )}

              <div className="voice-info-compact">
                <Volume2 size={11} />
                <span>{selectedVoice ? selectedVoice.name.split(' ').slice(0, 2).join(' ') : '...'}</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
