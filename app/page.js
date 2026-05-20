"use client";
import { useState, useRef, useEffect } from "react";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hey! 👋 I'm your personal fitness coach. I know you're working toward losing weight & toning up with your Reshape + weights schedule — let's make it happen.\n\n🍽️ Log a meal — tell me what you ate\n⚖️ Log your weight — tap the Weight tab\n✅ Daily check-in — how are you feeling today?\n\nWhat would you like to do?",
};

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
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        animation: "fadeUp 0.3s ease",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#c8f46a,#7ee8a2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2,
          }}
        >
          🏋️
        </div>
      )}
      <div
        style={{
          maxWidth: "78%",
          background: isUser ? "linear-gradient(135deg,#c8f46a,#a8e063)" : "rgba(255,255,255,0.06)",
          color: isUser ? "#1a1a1a" : "#f0f0f0",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.6,
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content.split("\n").map((line, i) => (
          <div key={i}>
            <MarkdownText text={line} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WeightChart({ entries }) {
  if (entries.length < 2) return null;
  const vals = entries.map((e) => e.weight);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const w = 300, h = 80;
  const points = entries.map((e, i) => {
    const x = (i / (entries.length - 1)) * (w - 20) + 10;
    const y = h - ((e.weight - min) / (max - min)) * (h - 20) - 10;
    return `${x},${y}`;
  });
  return (
    <div
      style={{
        padding: "12px 16px",
        background: "rgba(200,244,106,0.06)",
        borderRadius: 12, marginBottom: 12,
        border: "1px solid rgba(200,244,106,0.15)",
      }}
    >
      <div style={{ fontSize: 11, color: "#c8f46a", marginBottom: 6, fontFamily: "monospace", letterSpacing: 1 }}>
        WEIGHT TREND
      </div>
      <svg width={w} height={h}>
        <polyline fill="none" stroke="#c8f46a" strokeWidth="2" points={points.join(" ")} />
        {entries.map((e, i) => {
          const [x, y] = points[i].split(",");
          return <circle key={i} cx={x} cy={y} r="3" fill="#c8f46a" />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", marginTop: 4 }}>
        <span>{entries[0].date}</span>
        <span style={{ color: "#c8f46a", fontWeight: 700 }}>{entries[entries.length - 1].weight} kg</span>
        <span>{entries[entries.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function FitnessCoach() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [weightLog, setWeightLog] = useState([]);
  const [tab, setTab] = useState("chat");
  const [weightInput, setWeightInput] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const weightMatch = text.match(/(\d+\.?\d*)\s*kg/i);
    if (weightMatch) {
      const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      setWeightLog((prev) => [...prev, { weight: parseFloat(weightMatch[1]), date: today }]);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content || "Sorry, something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const logWeight = () => {
    if (!weightInput) return;
    sendMessage(`My weight today is ${weightInput}kg`);
    setWeightInput("");
    setTab("chat");
  };

  const quickActions = [
    { label: "🍽️ Log meal", text: "I want to log a meal" },
    { label: "✅ Check in", text: "Daily check-in" },
    { label: "💪 Post-workout", text: "Just finished my workout" },
    { label: "❓ Nutrition tip", text: "Give me a nutrition tip for today" },
  ];

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        background: "#0f0f0f",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#0f0f0f",
          paddingTop: "max(16px, env(safe-area-inset-top))",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>
            Fitness Coach <span style={{ color: "#c8f46a" }}>AI</span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>
            Lose weight & tone up · Reshape + Weights
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["chat", "weight"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "5px 12px", borderRadius: 20, border: "none",
                cursor: "pointer", fontSize: 12, fontWeight: 500,
                background: tab === t ? "#c8f46a" : "rgba(255,255,255,0.07)",
                color: tab === t ? "#1a1a1a" : "#aaa",
                transition: "all 0.2s",
              }}
            >
              {t === "chat" ? "💬 Chat" : "⚖️ Weight"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "0 16px" }}>
        {tab === "weight" ? (
          <div style={{ overflowY: "auto", padding: "20px 0" }}>
            <WeightChart entries={weightLog} />
            <div
              style={{
                background: "rgba(255,255,255,0.04)", borderRadius: 16,
                padding: 16, border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>Log today's weight</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && logWeight()}
                  placeholder="e.g. 68.5"
                  step="0.1"
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, padding: "10px 14px",
                    color: "#f0f0f0", fontSize: 15,
                    fontFamily: "'DM Mono', monospace",
                    outline: "none",
                  }}
                />
                <span style={{ color: "#666", fontSize: 13 }}>kg</span>
                <button
                  onClick={logWeight}
                  style={{
                    background: "#c8f46a", color: "#1a1a1a", border: "none",
                    borderRadius: 10, padding: "10px 18px",
                    fontWeight: 700, cursor: "pointer", fontSize: 14,
                  }}
                >
                  Log
                </button>
              </div>
            </div>
            {weightLog.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#444", marginBottom: 8, fontFamily: "monospace", letterSpacing: 1 }}>
                  HISTORY
                </div>
                {[...weightLog].reverse().map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                      borderRadius: 8, marginBottom: 4, fontSize: 13,
                    }}
                  >
                    <span style={{ color: "#888" }}>{e.date}</span>
                    <span style={{ color: "#c8f46a", fontFamily: "monospace", fontWeight: 600 }}>{e.weight} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Quick actions */}
            <div
              style={{
                display: "flex", gap: 6, overflowX: "auto",
                padding: "12px 0 8px", scrollbarWidth: "none",
              }}
            >
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => sendMessage(a.text)}
                  style={{
                    whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 20,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#ccc", fontSize: 12, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
              {messages.map((m, i) => (
                <Message key={i} msg={m} />
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "linear-gradient(135deg,#c8f46a,#7ee8a2)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                    }}
                  >
                    🏋️
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 6, height: 6, borderRadius: "50%", background: "#c8f46a",
                          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              style={{
                paddingBottom: "max(16px, env(safe-area-inset-bottom))",
                paddingTop: 8,
                background: "#0f0f0f",
              }}
            >
              <div
                style={{
                  display: "flex", gap: 8, alignItems: "flex-end",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16, padding: "8px 8px 8px 14px",
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Log a meal, your weight, or how you're feeling..."
                  rows={1}
                  style={{
                    flex: 1, background: "transparent", border: "none",
                    color: "#f0f0f0", fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.5, maxHeight: 100,
                    overflowY: "auto", resize: "none", outline: "none",
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  style={{
                    background: input.trim() && !loading ? "#c8f46a" : "rgba(255,255,255,0.08)",
                    color: input.trim() && !loading ? "#1a1a1a" : "#555",
                    border: "none", borderRadius: 10, width: 36, height: 36,
                    cursor: input.trim() && !loading ? "pointer" : "default",
                    fontSize: 16, display: "flex", alignItems: "center",
                    justifyContent: "center", transition: "all 0.2s", flexShrink: 0,
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
