import { useEffect, useState, useRef } from "react";
import { Shield, Cpu, Wifi, Database, Eye, Terminal, Zap, Lock, Fingerprint, Radio } from "lucide-react";

export default function JarvisLoader({ onFinish }) {
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("boot"); // boot, scan, ready
  const [matrixChars, setMatrixChars] = useState([]);
  const [glitchText, setGlitchText] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const bootSequence = [
    { text: "[SYS] Initializing kernel modules...", delay: 400, icon: "cpu" },
    { text: "[NET] Establishing secure tunnel...", delay: 500, icon: "wifi" },
    { text: "[SEC] Loading encryption protocols...", delay: 400, icon: "lock" },
    { text: "[DB]  Connecting neural database...", delay: 600, icon: "database" },
    { text: "[AI]  Loading AIVA language model...", delay: 500, icon: "zap" },
    { text: "[BIO] Calibrating voice biometrics...", delay: 400, icon: "fingerprint" },
    { text: "[SIG] Scanning frequency bands...", delay: 300, icon: "radio" },
    { text: "[VIS] Activating visual cortex...", delay: 400, icon: "eye" },
    { text: "[SYS] All subsystems nominal.", delay: 600, icon: "shield" },
    { text: "[RDY] AIVA PROTOCOL ACTIVE", delay: 800, icon: "terminal" },
  ];

  const iconMap = {
    cpu: Cpu, wifi: Wifi, lock: Lock, database: Database,
    zap: Zap, fingerprint: Fingerprint, radio: Radio,
    eye: Eye, shield: Shield, terminal: Terminal,
  };

  // Live clock (client-only to avoid hydration mismatch)
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Matrix rain effect on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "アイウエオカキクケコサシスセソタチツテトAIVA01{}[]<>/\\|=+-*&^%$#@!";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const drawMatrix = () => {
      ctx.fillStyle = "rgba(5, 8, 22, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ec489920";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animFrameRef.current = requestAnimationFrame(drawMatrix);
    };

    drawMatrix();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Boot sequence typewriter
  useEffect(() => {
    let lineIndex = 0;
    let charIndex = 0;
    let currentLines = [];

    const typeNext = () => {
      if (lineIndex >= bootSequence.length) {
        setPhase("scan");
        setTimeout(() => {
          setPhase("ready");
          speakBoot();
          setTimeout(onFinish, 1800);
        }, 1200);
        return;
      }

      const current = bootSequence[lineIndex];
      if (charIndex <= current.text.length) {
        const partial = current.text.slice(0, charIndex);
        const updatedLines = [
          ...currentLines,
          { text: partial, icon: current.icon, complete: false },
        ];
        setLines(updatedLines);
        setProgress(((lineIndex + charIndex / current.text.length) / bootSequence.length) * 100);
        charIndex++;
        setTimeout(typeNext, 18 + Math.random() * 12);
      } else {
        currentLines.push({
          text: current.text,
          icon: current.icon,
          complete: true,
        });
        setLines([...currentLines]);
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNext, current.delay);
      }
    };

    setTimeout(typeNext, 800);
  }, []);

  // Glitch text effect
  useEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const target = "A.I.V.A";
    let interval;

    if (phase === "scan") {
      let iterations = 0;
      interval = setInterval(() => {
        setGlitchText(
          target
            .split("")
            .map((char, i) => {
              if (i < iterations) return char;
              return glitchChars[Math.floor(Math.random() * glitchChars.length)];
            })
            .join("")
        );
        iterations += 0.4;
        if (iterations >= target.length + 1) {
          setGlitchText(target);
          clearInterval(interval);
        }
      }, 40);
    }

    return () => clearInterval(interval);
  }, [phase]);

  // Sound effects
  const playBootSound = (freq, dur, type = "square") => {
    if (typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) { }
  };

  useEffect(() => {
    playBootSound(200, 0.3, "triangle");
    const t1 = setTimeout(() => playBootSound(400, 0.2, "sawtooth"), 2000);
    const t2 = setTimeout(() => playBootSound(600, 0.4, "square"), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const speakBoot = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new window.SpeechSynthesisUtterance("AIVA protocol active. All systems online.");
      u.rate = 1.05;
      u.pitch = 1.1;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="hacker-loader">
      {/* Matrix canvas background */}
      <canvas ref={canvasRef} className="matrix-canvas" />

      {/* Scanlines overlay */}
      <div className="scanline-overlay" />

      {/* Main content */}
      <div className="loader-content">
        {/* Top bar */}
        <div className="loader-topbar">
          <div className="topbar-left">
            <Shield size={14} />
            <span>AIVA SECURE BOOT v2.4.1</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-blink" />
            <span suppressHydrationWarning>{currentTime}</span>
          </div>
        </div>

        {/* Terminal window */}
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="dot-red" />
              <span className="dot-yellow" />
              <span className="dot-green" />
            </div>
            <span className="terminal-title">
              <Terminal size={12} />
              aiva@system:~
            </span>
          </div>

          <div className="terminal-body">
            {lines.map((line, i) => {
              const IconComp = iconMap[line.icon];
              return (
                <div key={i} className={`term-line ${line.complete ? "complete" : "typing"}`}>
                  <span className="term-icon">
                    {IconComp && <IconComp size={13} />}
                  </span>
                  <span className="term-text">
                    {line.text}
                    {!line.complete && <span className="cursor-blink">█</span>}
                  </span>
                  {line.complete && <span className="term-ok">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="loader-progress-container">
          <div className="loader-progress-bar">
            <div className="loader-progress-fill" style={{ width: `${progress}%` }} />
            <div className="loader-progress-glow" style={{ left: `${progress}%` }} />
          </div>
          <div className="loader-progress-label">
            <span>BOOT SEQUENCE</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Phase: Scan / Ready */}
        {phase === "scan" && (
          <div className="scan-phase">
            <div className="scan-ring">
              <div className="scan-ring-inner" />
            </div>
            <div className="glitch-title">{glitchText}</div>
            <p className="scan-label">ESTABLISHING NEURAL LINK...</p>
          </div>
        )}

        {phase === "ready" && (
          <div className="ready-phase">
            <div className="ready-icon-pulse">
              <Zap size={32} />
            </div>
            <div className="ready-title">A.I.V.A</div>
            <p className="ready-sub">PROTOCOL ACTIVE</p>
          </div>
        )}
      </div>
    </div>
  );
}
