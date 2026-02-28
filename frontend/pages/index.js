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
  const [startBgIndex, setStartBgIndex] = useState(0);
  const startBackgrounds = ['/aiva_bg1.png', '/aiva_bg2.png'];
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [showMoodCam, setShowMoodCam] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isTextMode, setIsTextMode] = useState(false);

  const languageNames = {
    hi: 'Hindi', en: 'English'
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

  // Copilot-style animated text reveal — word by word blur-to-clear
  const animateMessage = (msgId, fullText) => {
    setAnimatingMsgId(msgId);
    setAnimatedText("");
    animatingRef.current = true;
    const words = fullText.split(/\s+/);
    let current = 0;
    const interval = setInterval(() => {
      if (!animatingRef.current) { clearInterval(interval); return; }
      current++;
      setAnimatedText(words.slice(0, current).join(' '));
      if (current >= words.length) {
        clearInterval(interval);
        setAnimatingMsgId(null);
        setAnimatedText("");
        animatingRef.current = false;
      }
    }, 40); // 40ms per word for smooth reveal
  };

  useEffect(() => { voicesRef.current = voices; }, [voices]);

  // Handle start overlays rotating icons and backgrounds
  useEffect(() => {
    if (!isLoading && !systemStarted) {
      const iconInterval = setInterval(() => {
        setStartIconIndex(prev => (prev + 1) % startIcons.length);
      }, 1500);

      const bgInterval = setInterval(() => {
        setStartBgIndex(prev => (prev + 1) % startBackgrounds.length);
      }, 6000); // Cross-fade background every 6 seconds

      return () => {
        clearInterval(iconInterval);
        clearInterval(bgInterval);
      };
    }
  }, [isLoading, systemStarted, startIcons.length, startBackgrounds.length]);
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
        // Support English
        if (l.startsWith('en')) return true;
        // Support Hindi (Filter down to Microsoft Hemant (Male) and Microsoft Kalpana/Swara (Female) if possible)
        if (l.startsWith('hi')) {
          // Broadly accept any Hindi voice to maintain OS compatibility
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
        v.name.includes("Google US English") || v.name.includes("Microsoft Zira") || v.name.includes("Samantha")
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
      rec.lang = "en-US";

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

  const runMoodScan = async () => {
    setShowMoodCam(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setTimeout(async () => {
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, 300, 200);
          const image = canvasRef.current.toDataURL('image/jpeg');
          stream.getTracks().forEach(t => t.stop());
          setShowMoodCam(false);
          setMoodLoading(true);
          try {
            const res = await fetch("/api/voice/mood", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
              body: JSON.stringify({ image })
            });
            const data = await res.json();
            if (data.response) {
              // Handle mood-based personality change
              if (data.voiceProfile === 'Energetic' || data.mood === 'HAPPY') {
                const hv = voices.find(v => v.lang.startsWith('hi'));
                if (hv) { setSelectedVoice(hv); voiceRef.current = hv; }
              } else if (data.voiceProfile === 'Soothing' || data.mood === 'SAD') {
                const sv = voices.find(v => v.name.includes('Zira') || v.name.includes('Samantha'));
                if (sv) { setSelectedVoice(sv); voiceRef.current = sv; }
              }
              finishResponse(data.response);
            }
          } catch (e) {
            finishResponse("I couldn't identify your mood today, but you look great! 😄");
          }
          setMoodLoading(false);
        }
      }, 3000); // 3 seconds to "look" at the camera
    }
  };

  const initializeSystem = () => {
    setSystemStarted(true);
    setStatus("System Online");
    const all = window.speechSynthesis.getVoices();
    if (all.length > 0 && !selectedVoice) setSelectedVoice(all[0]);
    speakResponse("Hi! I am AIVA, made by Debasmita and Babin. How can I assist you?");
    addMessage('bot', "Hi! I'm AIVA — your AI voice assistant. Tap the mic or try a suggestion below to get started.");
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

    addMessage('user', command);

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

    // Client-side time
    if (lower.match(/what.*time/) || lower.includes('current time') || lower.match(/time now/)) {
      const t = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric', hour12: true });
      const msg = `It is ${t}.`;
      finishResponse(msg);
      return;
    }
    // Client-side date
    if (lower.match(/what.*date/) || lower.match(/what.*day/) || lower.includes('current date')) {
      const d = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      finishResponse(`Today is ${d}.`);
      return;
    }

    // Send to backend
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ command })
      });
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
    const cleanedText = text.replace(/[*#_`~[\]=+\-]/g, '').trim();

    const u = new SpeechSynthesisUtterance(cleanedText);
    const v = voiceRef.current;
    if (v) u.voice = v;
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
        speakResponse(`Voice changed to ${languageNames[prefix] || prefix}`);
      }
    } else {
      const voice = voices.find(v => v.name === val);
      if (voice) {
        setSelectedVoice(voice);
        voiceRef.current = voice;
        speakResponse(`Voice changed to ${voice.name}`);
      }
    }
  };

  const features = [
    { icon: Mic, title: "Voice Control", desc: "Natural speech input" },
    { icon: Globe, title: "Smart Search", desc: "Real-time web browsing" },
    { icon: CloudSun, title: "Live Weather", desc: "City-level accuracy" },
    { icon: Cpu, title: "AI Powered", desc: "Llama 3.3 70B via Groq" },
    { icon: Laugh, title: "Mood Scan", desc: "AI personality based on your face", action: runMoodScan },
  ];

  const suggestions = [
    { icon: Clock, label: "What time is it?", cmd: "What is the time?" },
    { icon: CloudSun, label: "Weather in Delhi", cmd: "What is the weather in Delhi?" },
    { icon: Globe, label: "Latest News", cmd: "Give me the latest news headlines" },
    { icon: Laugh, label: "Tell me a joke", cmd: "Tell me a joke" },
  ];

  // Format basic markdown (bold and italic) safely
  const formatText = (text) => {
    if (!text) return { __html: "" };
    let parsed = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
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
              {/* Cycling Backgrounds */}
              {startBackgrounds.map((bg, idx) => (
                <div
                  key={bg}
                  className={`start-bg-layer ${idx === startBgIndex ? 'active' : ''}`}
                  style={{ backgroundImage: `url(${bg})` }}
                />
              ))}

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
                  <Icon size={20} className={`chip-icon ${f.title === 'Mood Scan' && moodLoading ? 'icon-pulse' : ''}`} />
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
                        <p className={isAnimating ? 'typewriter-text' : ''} dangerouslySetInnerHTML={formatText(displayText)} />
                      ) : (
                        <p dangerouslySetInnerHTML={formatText(msg.text)} />
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

              {/* Hidden Cam for Mood Scan */}
              {showMoodCam && (
                <div className="mood-cam-overlay">
                  <div className="mood-cam-window">
                    <video ref={videoRef} autoPlay muted playsInline></video>
                    <div className="mood-cam-scanning"></div>
                    <p>Establishing Eye Contact...</p>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} width="300" height="200"></canvas>

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
