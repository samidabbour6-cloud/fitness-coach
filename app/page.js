"use client";
import { useState, useRef, useEffect } from "react";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hey! 👋 I'm your personal fitness coach. I know you're working toward losing weight & toning up with your Reshape + weights schedule — let's make it happen.\n\n🍽️ Log a meal — describe it or take a photo\n⚖️ Log your weight — tap the Tracking tab\n✅ Daily check-in — how are you feeling today?\n\nWhat would you like to do?",
};

const CALORIE_GOAL = 1600;

function MarkdownText({ text }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  const textContent =
    typeof msg.content === "string"
      ? msg.content
      : msg.content?.find((c) => c.type === "text")?.text || "";
  const imageContent =
    typeof msg.content !== "string"
      ? msg.content?.find((c) => c.type === "image")
      : null;

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12, animation: "fadeUp 0.3s ease" }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#c8f46a,#7ee8a2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2 }}>🏋️</div>
      )}
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 6, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {imageContent && (
          <img src={`data:${imageContent.source.media_type};base64,${imageContent.source.data}`} alt="meal" style={{ maxWidth: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} />
        )}
        {textContent && (
          <div style={{ background: isUser ? "linear-gradient(135deg,#c8f46a,#a8e063)" : "rgba(255,255,255,0.06)", color: isUser ? "#1a1a1a" : "#f0f0f0", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)", whiteSpace: "pre-wrap" }}>
            {textContent.split("\n").map((line, i) => (<div key={i}><MarkdownText text={line} /></div>))}
          </div>
        )}
      </div>
    </div>
  );
}

function LineChart({ data, label, color, unit, goal }) {
  if (data.length < 1) return (
    <div style={{ textAlign: "center", color: "#444", fontSize: 12, padding: "20px 0" }}>No data yet</div>
  );
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals, goal || Infinity) - 2;
  const max = Math.max(...vals, goal || 0) + 2;
  const w = 300, h = 90;
  const getX = (i) => data.length === 1 ? w / 2 : (i / (data.length - 1)) * (w - 20) + 10;
  const getY = (v) => h - ((v - min) / (max - min)) * (h - 20) - 10;
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const goalY = goal ? getY(goal) : null;

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {goalY && (
        <line x1="10" y1={goalY} x2={w - 10} y2={goalY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,4" />
      )}
      {data.length > 1 && (
        <polyline fill="none" stroke={color} strokeWidth="2" points={points.join(" ")} />
      )}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.value)} r="4" fill={color} />
          {i === data.length - 1 && (
            <text x={getX(i)} y={getY(d.value) - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
              {d.value}{unit}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function TrackingCard({ title, color, children }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: `1px solid ${color}22`, marginBottom: 12 }}>
      <div style={{ fontSize: 11, color, marginBottom: 10, fontFamily: "monospace", letterSpacing: 1 }}>{title}</div>
      {children}
    </div>
  );
}

export default function FitnessCoach() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("chat");
  const [pendingImage, setPendingImage] = useState(null);
  const [weightLog, setWeightLog] = useState([]);
  const [calorieLog, setCalorieLog] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [calorieInput, setCalorieInput] = useState("");
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const todayStr = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      setPendingImage({ base64, mediaType: file.type, preview: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const parseCaloriesFromReply = (text) => {
    const match = text.match(/~?(\d{3,4})\s*(kcal|cal|calories)/i);
    return match ? parseInt(match[1]) : null;
  };

  const sendMessage = async (text, imageData) => {
    if (!text.trim() && !imageData) return;
    if (loading) return;

    let userContent = imageData
      ? [
          { type: "image", source: { type: "base64", media_type: imageData.mediaType, data: imageData.base64 } },
          { type: "text", text: text.trim() || "What do you think of this meal? Please estimate the calories." },
        ]
      : text;

    const userMsg = { role: "user", content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImage(null);
    setLoading(true);

    const weightMatch = text.match(/(\d+\.?\d*)\s*kg/i);
    if (weightMatch) {
      setWeightLog((prev) => {
        const today = todayStr();
        const filtered = prev.filter((e) => e.date !== today);
        return [...filtered, { value: parseFloat(weightMatch[1]), date: today }];
      });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.content || "Sorry, something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      const cals = parseCaloriesFromReply(reply);
      if (cals) {
        const today = todayStr();
        setCalorieLog((prev) => {
          const existing = prev.find((e) => e.date === today);
          if (existing) {
            return prev.map((e) => e.date === today ? { ...e, value: e.value + cals } : e);
          }
          return [...prev, { date: today, value: cals }];
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const logWeight = () => {
    if (!weightInput) return;
    sendMessage(`My weight today is ${weightInput}kg`);
    setWeightInput("");
  };

  const logCalories = () => {
    if (!calorieInput) return;
    const cals = parseInt(calorieInput);
    const today = todayStr();
    setCalorieLog((prev) => {
      const existing = prev.find((e) => e.date === today);
      if (existing) return prev.map((e) => e.date === today ? { ...e, value: e.value + cals } : e);
      return [...prev, { date: today, value: cals }];
    });
    setCalorieInput("");
  };

  const netCalories = calorieLog.map((e) => ({ date: e.date, value: e.value - CALORIE_GOAL }));
  const todayCalories = calorieLog.find((e) => e.date === todayStr())?.value || 0;
  const remaining = CALORIE_GOAL - todayCalories;

  const quickActions = [
    { label: "🍽️ Log meal", text: "I want to log a meal" },
    { label: "✅ Check in", text: "Daily check-in" },
    { label: "💪 Post-workout", text: "Just finished my workout" },
    { label: "❓ Nutrition tip", text: "Give me a nutrition tip for today" },
  ];

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", background: "#0f0f0f", fontFamily: "'DM Sans', sans-serif", color: "#f0f0f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=DM+Mono&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.3}50%{opacity:1} }
        *{box-sizing:border-box} textarea{resize:none} textarea:focus,input:focus{outline:none}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f0f", paddingTop: "max(16px, env(safe-area-inset-top))" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Fitness Coach <span style={{ color: "#c8f46a" }}>AI</span></div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>Lose weight & tone up · Reshape + Weights</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["chat","💬"],["track","📊"]].map(([t, icon]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: tab === t ? "#c8f46a" : "rgba(255,255,255,0.07)", color: tab === t ? "#1a1a1a" : "#aaa", transition: "all 0.2s" }}>
              {icon} {t === "chat" ? "Chat" : "Track"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "0 16px" }}>
        {tab === "track" ? (
          <div style={{ overflowY: "auto", padding: "16px 0" }}>

            {/* Today summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ background: "rgba(200,244,106,0.08)", borderRadius: 12, padding: 12, border: "1px solid rgba(200,244,106,0.2)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#c8f46a", fontFamily: "monospace", letterSpacing: 1 }}>TODAY</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#c8f46a" }}>{todayCalories}</div>
                <div style={{ fontSize: 11, color: "#888" }}>kcal eaten</div>
              </div>
              <div style={{ background: remaining >= 0 ? "rgba(126,232,162,0.08)" : "rgba(255,100,100,0.08)", borderRadius: 12, padding: 12, border: `1px solid ${remaining >= 0 ? "rgba(126,232,162,0.2)" : "rgba(255,100,100,0.2)"}`, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: remaining >= 0 ? "#7ee8a2" : "#ff6464", fontFamily: "monospace", letterSpacing: 1 }}>REMAINING</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: remaining >= 0 ? "#7ee8a2" : "#ff6464" }}>{Math.abs(remaining)}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{remaining >= 0 ? "kcal left" : "kcal over"}</div>
              </div>
            </div>

            {/* Log calories manually */}
            <TrackingCard title="➕ LOG CALORIES MANUALLY" color="#c8f46a">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" value={calorieInput} onChange={(e) => setCalorieInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logCalories()} placeholder="e.g. 450" style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#f0f0f0", fontSize: 14, fontFamily: "'DM Mono', monospace" }} />
                <span style={{ color: "#666", fontSize: 12 }}>kcal</span>
                <button onClick={logCalories} style={{ background: "#c8f46a", color: "#1a1a1a", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Add</button>
              </div>
            </TrackingCard>

            {/* Weight chart */}
            <TrackingCard title="⚖️ WEIGHT (KG)" color="#c8f46a">
              <LineChart data={weightLog} color="#c8f46a" unit="kg" />
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <input type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()} placeholder="Today's weight" step="0.1" style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#f0f0f0", fontSize: 14, fontFamily: "'DM Mono', monospace" }} />
                <span style={{ color: "#666", fontSize: 12 }}>kg</span>
                <button onClick={logWeight} style={{ background: "#c8f46a", color: "#1a1a1a", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Log</button>
              </div>
            </TrackingCard>

            {/* Calorie intake chart */}
            <TrackingCard title="🍽️ CALORIE INTAKE" color="#7ee8a2">
              <LineChart data={calorieLog} color="#7ee8a2" unit="kcal" goal={CALORIE_GOAL} />
              <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Dashed line = {CALORIE_GOAL} kcal goal</div>
            </TrackingCard>

            {/* Net calories chart */}
            <TrackingCard title="📉 NET CALORIES (vs goal)" color="#f4a76a">
              <LineChart data={netCalories} color="#f4a76a" unit="" />
              <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Negative = under goal ✅ · Positive = over goal ⚠️</div>
            </TrackingCard>

          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0 8px", scrollbarWidth: "none" }}>
              {quickActions.map((a) => (
                <button key={a.label} onClick={() => sendMessage(a.text)} style={{ whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{a.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
              {messages.map((m, i) => <Message key={i} msg={m} />)}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#c8f46a,#7ee8a2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏋️</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0,1,2].map((i) => (<div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8f46a", animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {pendingImage && (
              <div style={{ position: "relative", marginBottom: 8, display: "inline-block" }}>
                <img src={pendingImage.preview} alt="pending" style={{ height: 80, borderRadius: 10, objectFit: "cover" }} />
                <button onClick={() => setPendingImage(null)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ff4444", border: "none", color: "white", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            )}

            <div style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))", paddingTop: 8, background: "#0f0f0f" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "8px 8px 8px 14px" }}>
                <button onClick={() => fileInputRef.current?.click()} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, padding: "4px", flexShrink: 0, opacity: 0.6 }}>📷</button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: "none" }} />
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input, pendingImage); } }}
                  placeholder="Describe a meal, or tap 📷 to take a photo..." rows={1}
                  style={{ flex: 1, background: "transparent", border: "none", color: "#f0f0f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" }} />
                <button onClick={() => sendMessage(input, pendingImage)} disabled={(!input.trim() && !pendingImage) || loading}
                  style={{ background: (input.trim() || pendingImage) && !loading ? "#c8f46a" : "rgba(255,255,255,0.08)", color: (input.trim() || pendingImage) && !loading ? "#1a1a1a" : "#555", border: "none", borderRadius: 10, width: 36, height: 36, cursor: (input.trim() || pendingImage) && !loading ? "pointer" : "default", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>↑</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
