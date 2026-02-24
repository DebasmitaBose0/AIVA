import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import JarvisLoader from "../components/JarvisLoader";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function Home() {
  const [status, setStatus] = useState("System Offline");
  const [lastCommand, setLastCommand] = useState("");
  const [response, setResponse] = useState("");
  const [chatHistory, setChatHistory] = useState([]); // Chat history state (objects with type,text,time)
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [missingLangs, setMissingLangs] = useState([]); // languages with no voice found
  const [systemStarted, setSystemStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showHud, setShowHud] = useState(false); // control HUD visibility
  
  // Mapping of language codes to display names (for dropdown and logging)
  const languageNames = {
    hi: 'Hindi',
    bn: 'Bengali',
    ta: 'Tamil',
    te: 'Telugu',
    mr: 'Marathi',
    gu: 'Gujarati',
    kn: 'Kannada',
    ml: 'Malayalam',
    pa: 'Punjabi',
    en: 'English',
    // add more as needed
  };

  // Ref to keep track of the selected voice in callbacks/closures
  const voiceRef = useRef(null);
  const voicesRef = useRef([]); // Ref for voices list

  // scroll chat to bottom on update
  useEffect(() => {
    const el = document.getElementById('chat-end');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // copy chat contents
  const copyChat = () => {
    if (chatHistory.length === 0) return;
    const text = chatHistory.map(m => `[${m.time}] ${m.type==='user'?'You':'AIVA'}: ${m.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setStatus('Chat copied to clipboard');
      speakResponse('Chat copied to clipboard.');
      setTimeout(() => setStatus('System Online'), 3000);
    }).catch(err => {
      console.error('Copy failed', err);
      setStatus('Copy failed');
      speakResponse('Unable to copy chat.');
    });
  };

  // clear chat history
  const clearChat = () => {
    setChatHistory([]);
    setResponse('');
    setStatus('Chat cleared');
    speakResponse('Chat history cleared.');
    setTimeout(() => setStatus('System Online'), 3000);
  };

  // show history alert (simple)
  const showHistory = () => {
    if (chatHistory.length === 0) {
      alert('No history available');
      return;
    }
    const text = chatHistory.map(m => `[${m.time}] ${m.type==='user'?'You':'AIVA'}: ${m.text}`).join('\n');
    alert(text);
  };

  // helper to add a message with timestamp
  const addMessage = (type, text) => {
    const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.type === type && last.text === text) {
        // avoid duplicate consecutive message
        return prev;
      }
      return [...prev, { type, text, time }];
    });
    if (type === 'bot') setResponse(text);
  };

  // if the first message is clipped by the panel (due to margin/HUD), drop it
  useEffect(() => {
    const container = document.querySelector('.glass-panel');
    if (!container) return;
    const msgs = container.getElementsByClassName('chat-msg');
    if (msgs.length > 0) {
      const first = msgs[0];
      const contRect = container.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      if (firstRect.bottom < contRect.top + 2) {
        // message is completely above the visible top; remove it
        setChatHistory(prev => prev.slice(1));
      }
    }
  }, [chatHistory]);

  // Sync ref with state
  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  // Sync ref with state and update recognition language
  useEffect(() => {
    voiceRef.current = selectedVoice;
    if (recognition && selectedVoice) {
      // Map voice language to recognition language if needed, or use directly
      // Most voices have a lang property like 'en-US', 'hi-IN', etc.
      console.log("Setting recognition language to:", selectedVoice.lang);
      recognition.lang = selectedVoice.lang;
    }
  }, [selectedVoice, recognition]);

  // 🎙️ Setup Speech Recognition & Voices
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load Voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        console.log("Voices loaded:", availableVoices.length);
        
        // Filter: Keep only English and the Indian languages we support
        const filteredVoices = availableVoices.filter(voice => {
            const lang = voice.lang.toLowerCase();
            // keep if it's english or starts with one of our indian codes
            return lang.startsWith('en') ||
                   lang.startsWith('hi') ||
                   lang.startsWith('bn') ||
                   lang.startsWith('ta') ||
                   lang.startsWith('te') ||
                   lang.startsWith('mr') ||
                   lang.startsWith('gu') ||
                   lang.startsWith('kn') ||
                   lang.startsWith('ml') ||
                   lang.startsWith('pa') ||
                   lang.includes('in');   // generic indian region fallback
        });

        // Sort: Prioritize Indian accents/languages, then other English
        const sortedVoices = filteredVoices.sort((a, b) => {
            const aIsIndian = a.lang.toLowerCase().includes('in');
            const bIsIndian = b.lang.toLowerCase().includes('in');
            if (aIsIndian && !bIsIndian) return -1;
            if (!aIsIndian && bIsIndian) return 1;
            return 0;
        });

        setVoices(sortedVoices);
        
        // Determine which of our target Indian language codes are missing a voice
        const indianCodes = ['hi','bn','ta','te','mr','gu','kn','ml','pa'];
        const missing = [];
        indianCodes.forEach(code => {
            const found = sortedVoices.some(v =>
                v.lang.toLowerCase().startsWith(code) && v.lang.toLowerCase().includes('in')
            );
            if (!found) {
                console.warn(`No ${languageNames[code] || code} voice with Indian accent found.`);
                missing.push(languageNames[code] || code);
            }
        });
        setMissingLangs(missing);

        // Check if any Indian voices were found at all
        const hasAnyIndian = sortedVoices.some(v => v.lang.toLowerCase().includes('in'));
        if (!hasAnyIndian && availableVoices.length > 0) {
            console.warn("No Indian voices found. Please install language packs in your OS settings.");
        }
        
        // Try to find a good "JARVIS" or "AI" voice (Prioritize Indian English if available)
        const preferredVoice = sortedVoices.find(v => 
          v.name.includes("Google US English") || 
          v.name.includes("Microsoft Zira") || 
          v.name.includes("Samantha")
        ) || sortedVoices[0];
        
        if (preferredVoice) {
          console.log("Selected voice:", preferredVoice.name);
          setSelectedVoice(preferredVoice);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      // Setup Recognition
      if ("webkitSpeechRecognition" in window) {
        const rec = new window.webkitSpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          console.log("Recognition started");
          setIsListening(true);
          setStatus("Listening...");
        };

        rec.onresult = (event) => {
          const command = event.results[0][0].transcript;
          console.log("Command received:", command);
          setLastCommand(command);
          setResponse(""); // Clear previous response
          setStatus("Processing...");
          processCommand(command);
        };

        rec.onend = () => {
          console.log("Recognition ended");
            setIsListening(false);
        };

        rec.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setStatus("System Online");
          setIsListening(false);
        };

        setRecognition(rec);
      } else {
        setIsSupported(false);
        setStatus("Voice Input Not Supported");
      }
    }
  }, []);

  // 🚀 Initialize System
  const initializeSystem = () => {
    setSystemStarted(true);
    setStatus("System Online");
    // Force a voice load check
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0 && !selectedVoice) {
       setSelectedVoice(availableVoices[0]);
    }
    speakResponse("Hi there! I am AIVA, made by Debasmita. How can I assist you?");
  };

  // Audio Context Ref
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const [volume, setVolume] = useState(0);

  // Initialize Audio Context
  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    }
  };

  // Play UI Sound
  const playSound = (type) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);

    if (type === 'start') {
      osc.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioContextRef.current.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.1);
    } else if (type === 'end') {
      osc.frequency.setValueAtTime(880, audioContextRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioContextRef.current.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.1);
    }
  };

  // ▶ Start Listening
  const startListening = async () => {
    await initAudio();
    playSound('start');

    // give user a visible cue before recording begins
    setStatus("Ready to speak with AIVA");
    addMessage('bot', 'Ready to speak with AIVA');

    if (recognition) {
      try {
        recognition.start();
        
        // Start Audio Visualizer
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);
            updateVolume();
        } catch (err) {
            console.error("Error accessing microphone for visualizer:", err);
        }

      } catch (e) {
        console.error("Start error:", e);
      }
    }
  };

  const updateVolume = () => {
    if (!analyserRef.current || !isListening) return;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const avg = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
    setVolume(avg);
    if (isListening) {
        requestAnimationFrame(updateVolume);
    }
  };

  // Stop Visualizer when listening stops
  useEffect(() => {
      if (!isListening) {
          if (sourceRef.current) {
              // sourceRef.current.disconnect(); // Optional: disconnect if needed
          }
          setVolume(0);
          if (audioContextRef.current && audioContextRef.current.state === 'running') {
             playSound('end');
          }
      } else {
          if (analyserRef.current) {
              updateVolume();
          }
      }
  }, [isListening]);

  // track last user command to avoid accidental duplicates from speech API
  const lastUserCommand = useRef('');
  const lastUserTime = useRef(0);

  // 🌐 Send command to backend
  const processCommand = async (command) => {
    // guard against repeated recognition events
    const now = Date.now();
    if (command === lastUserCommand.current && now - lastUserTime.current < 1000) {
      console.log('ignoring duplicate command', command);
      return;
    }
    lastUserCommand.current = command;
    lastUserTime.current = now;

    // immediately record user message to avoid lost input
    addMessage('user', command);

    const lowerCmd = command.toLowerCase();
    // handle local time/date queries on client side
    const lower = lowerCmd;
    if (lower.match(/what.*time/) || lower.includes('current time') || lower.match(/time now/) || lower.match(/what is the time/)) {
      const localTime = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric', hour12: true });
      const msg = `It is ${localTime}.`;
      setResponse(msg);
      addMessage('bot', msg);
      speakResponse(msg);
      setStatus("Response Ready");
      setTimeout(() => setStatus("System Online"), 3000);
      return;
    }
    if (lower.match(/what.*date/) || lower.match(/what.*day/) || lower.includes('current date')) {
      const localDate = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const msg = `Today is ${localDate}.`;
      setResponse(msg);
      addMessage('bot', msg);
      speakResponse(msg);
      setStatus("Response Ready");
      setTimeout(() => setStatus("System Online"), 3000);
      return;
    }

    if (lowerCmd.includes('latest news') || lowerCmd.match(/news about (.+)/)) {
        const topic = lowerCmd.match(/news about (.+)/)[1];
        const r = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&apiKey=${NEWS_KEY}`);
        const json = await r.json();
        if (json.articles && json.articles.length) {
            const msg = json.articles[0].title + ' — ' + json.articles[0].description;
            addMessage('bot', msg);
            return msg;
        }
        const noMsg = 'No recent news found on ' + topic;
        addMessage('bot', noMsg);
        return noMsg;
    }

    try {
      console.log("Sending to backend...", command);
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY
        },
        body: JSON.stringify({ command })
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Failed to parse JSON from backend", e);
        data = null;
      }
      console.log("Backend returned status", res.status, "data", data);

      if (res.ok && data) {
        // Handle Actions
        if (data.action === 'CHANGE_VOICE' && data.voiceName) {
            const targetName = data.voiceName.toLowerCase();
            const availableVoices = voicesRef.current;
            const foundVoice = availableVoices.find(v => v.name.toLowerCase().includes(targetName));
            
            if (foundVoice) {
                setSelectedVoice(foundVoice);
                voiceRef.current = foundVoice; // Update ref immediately
                console.log(`Voice changed to: ${foundVoice.name}`);
            } else {
                // If voice not found, append a note to the response
                data.response += ` (Note: I couldn't find a voice named \"${data.voiceName}\" on this device.)`;
            }
        }

        // auto‑select voice based on response script/language
        const detectLang = (text) => {
          // use Unicode script property; requires `u` flag
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
        const langCode = detectLang(data.response);
        if (langCode) {
          // prefer a voice that matches the language and has Indian region accent
          let matchVoice = voices.find(v =>
            v.lang.toLowerCase().startsWith(langCode) && v.lang.toLowerCase().includes('in')
          );
          if (!matchVoice) {
            matchVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
          }
          if (matchVoice && matchVoice.name !== selectedVoice?.name) {
            setSelectedVoice(matchVoice);
            voiceRef.current = matchVoice;
          }
        }

        setResponse(data.response);
        addMessage('bot', data.response);
        setStatus("Response Ready");
        speakResponse(data.response);
        setTimeout(() => setStatus("System Online"), 3000);
      } else {
        console.warn("Non-OK response from backend", res.status, data);
        handleError("Error processing command");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      handleError("Network error");
    }
  };

  // 🔊 Speak response
  const speakResponse = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      console.log("Speaking:", text);
      window.speechSynthesis.cancel(); // Stop previous speech

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Use the ref to get the current selected voice, even inside stale closures
      const currentVoice = voiceRef.current;

      if (currentVoice) {
        utterance.voice = currentVoice;
      } else {
        // Fallback: try to get voices again
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            utterance.voice = voices[0];
        }
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
          console.log("Speech finished");
      };
      
      utterance.onerror = (e) => {
          console.error("Speech error:", e);
      };

      window.speechSynthesis.speak(utterance);
    } else {
        console.error("Speech synthesis not supported");
    }
  };

  // Typewriter Effect Hook
  const useTypewriter = (text, speed = 20) => {
    const [displayText, setDisplayText] = useState('');
    
    useEffect(() => {
      if (!text) {
        setDisplayText('');
        return;
      }
      
      let i = 0;
      setDisplayText('');
      
      const timer = setInterval(() => {
        if (i < text.length) {
          i++;
          setDisplayText(text.substring(0, i));
        } else {
          clearInterval(timer);
        }
      }, speed);

      return () => clearInterval(timer);
    }, [text, speed]);
    
    return displayText;
  };

  // Component for Typewriter Text
  const TypewriterText = ({ text }) => {
    const displayText = useTypewriter(text);
    return <span>{displayText}</span>;
  };

  // ❌ Error handler
  const handleError = (msg) => {
    setResponse(msg);
    addMessage('bot', msg);
    setStatus("Error");
    speakResponse(msg);
    setTimeout(() => setStatus("System Online"), 3000);
  };

  return (
    <div className="container">
      <Head>
        <title>AIVA by DB</title>
        <link rel="icon" href="/favicon.svg" />
        <link href="https://fonts.googleapis.com/css?family=Orbitron:700&display=swap" rel="stylesheet" />
      </Head>
      
      {isLoading && <JarvisLoader onFinish={() => setIsLoading(false)} />}

      {!isLoading && (
        <>
          {/* HUD Corners */}
          {showHud && (
            <>
              <div className="hud-corner top-left">
                💻 SYSTEM: ONLINE<br/>
                ⚙️ CPU: 12%<br/>
                🧠 MEM: 4.2GB
              </div>
              
              <div className="hud-corner bottom-left">
                🔋 PWR: 98%<br/>
                🌡️ TMP: 34°C
              </div>
              <div className="hud-corner bottom-right">
                📦 VER: 2.0.1<br/>
                🛠️ BLD: ALPHA
              </div>
            </>
          )}

      {!systemStarted && (
        <div className="start-overlay">
          <button className="start-btn" onClick={initializeSystem}>
            INITIALIZE AIVA PROTOCOL
          </button>
        </div>
      )}

      <div className="voice-controls">
        <select 
          className="voice-select"
          onChange={(e) => {
            const val = e.target.value;
            if (val.startsWith('lang:')) {
              // user selected a language, pick first matching voice with Indian accent
              const prefix = val.slice(5);
              let found = voices.find(v=>
                v.lang.toLowerCase().startsWith(prefix) && v.lang.toLowerCase().includes('in')
              );
              if (!found) {
                // fallback to any voice in that language
                found = voices.find(v=>
                  v.lang.toLowerCase().startsWith(prefix)
                );
              }
              if (found) {
                setSelectedVoice(found);
                voiceRef.current = found;
                const utterance = new SpeechSynthesisUtterance("Voice system updated.");
                utterance.voice = found;
                window.speechSynthesis.speak(utterance);
              }
            } else {
              const voice = voices.find(v => v.name === val);
              if (voice) {
                setSelectedVoice(voice);
                voiceRef.current = voice;
                const utterance = new SpeechSynthesisUtterance("Voice system updated.");
                utterance.voice = voice;
                window.speechSynthesis.speak(utterance);
              }
            }
          }}
          value={selectedVoice?.name || ""}
        >
          {voices.length === 0 && <option>Loading voices...</option>}
          {/* language shortcuts */}
          <option disabled>──────────── Languages ────────────</option>
          <option value="lang:hi">Hindi</option>
          <option value="lang:bn">Bengali</option>
          <option value="lang:ta">Tamil</option>
          <option value="lang:te">Telugu</option>
          <option value="lang:mr">Marathi</option>
          <option value="lang:gu">Gujarati</option>
          <option value="lang:kn">Kannada</option>
          <option value="lang:ml">Malayalam</option>
          <option value="lang:pa">Punjabi</option>
          <option disabled>──────────── Voices ────────────</option>
          {/* group voices by base language code for better organization */}
          {(() => {
            const groups = {};
            voices.forEach(v => {
              const code = v.lang.split('-')[0];
              if (!groups[code]) groups[code] = [];
              groups[code].push(v);
            });
            return Object.entries(groups).map(([code, list]) => (
              <optgroup key={code} label={languageNames[code] || code}>
                {list.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang}{voice.lang.toLowerCase().includes('in') ? ' – Indian accent' : ''})
                  </option>
                ))}
              </optgroup>
            ));
          })()}
        </select>
        {voices.length > 0 && !voices.some(v => v.lang.includes('IN')) && (
            <div style={{fontSize: '0.7rem', color: 'rgba(0,255,255,0.5)', textAlign: 'right', marginTop: '5px'}}>
                * Install OS language packs for Indian voices
            </div>
        )}
        {voices.length > 0 && (
            <div style={{fontSize: '0.7rem', color: 'rgba(0,255,255,0.5)', textAlign: 'right', marginTop: '3px'}}>
                Voices are grouped by language; Indian‑accent variants are flagged in the list so you can choose the best match for your state.
            </div>
        )}
        {missingLangs.length > 0 && (
            <div style={{fontSize: '0.7rem', color: '#ff6666', textAlign: 'right', marginTop: '3px'}}>
                * No Indian‑accent voice available for: {missingLangs.join(', ')}. Install language packs if needed.
            </div>
        )}
      </div>

      <h1 className="title">AIVA</h1>
      <p className="subtitle">ARTIFICIAL INTELLIGENCE VOICE ASSISTANT</p>

      <div className="mic-container">
        <div className="arc-reactor">
            <div className="ring-1" style={{ transform: `scale(${1 + volume / 100})`, boxShadow: `0 0 ${20 + volume}px rgba(0, 255, 255, 0.5)` }}></div>
            <div className="ring-2" style={{ transform: `rotate(${Date.now() / 50}deg) scale(${1 + volume / 150})` }}></div>
            <div className="ring-3"></div>
        </div>
        <button
          className={`mic-button ${isListening ? "listening" : ""}`}
          onClick={startListening}
          disabled={!isSupported}
          style={{ transform: `scale(${1 + volume / 200})` }}
        >
          🎤
        </button>
      </div>

      <div className="status-display">
        [{status}]
      </div>
      {/* chat toolbar */}
      <div className="chat-tools">
        <button onClick={copyChat}>📋 Copy Chat</button>
        <button onClick={clearChat}>🗑️ Clear Chat</button>
        <button onClick={showHistory}>📜 History</button>
        <button onClick={() => setShowHud(prev => !prev)}>{showHud ? '🙈 Hide HUD' : '👁️ Show HUD'}</button>
      </div>

      {(chatHistory.length > 0 || lastCommand) && (
        <div className="glass-panel">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`chat-msg ${msg.type}`}>            
              {msg.type === 'bot' && <div className="avatar">🤖</div>}
              <div className="bubble">
                <p>{msg.text}</p>
                <div className="timestamp">{msg.time}</div>
              </div>
              {msg.type === 'user' && <div className="avatar">👤</div>}
            </div>
          ))}
          
          {status === "Processing..." && lastCommand && (
             <div className="chat-msg user">
               <div className="bubble" style={{ opacity: 0.7 }}>
                 <p>&gt; {lastCommand} <span className="blink">_</span></p>
               </div>
               <div className="avatar">👤</div>
             </div>
          )}
          <div id="chat-end" />
        </div>
      )}
      
      {!isSupported && (
        <p style={{color: 'red', marginTop: '20px'}}>
          CRITICAL ERROR: BROWSER NOT SUPPORTED
        </p>
      )}
      </>
      )}
    </div>
  );
}
