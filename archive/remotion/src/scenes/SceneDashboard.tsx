import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS } from "../theme";
import { PLAYFAIR, DMSANS } from "../fonts";

const NAV = ["Overview", "Participants", "Chat", "Whiteboard", "Resources", "Quizzes", "Recordings", "Analytics"];
const PARTICIPANTS = [
  { n: "Dr. Elara Zion", r: "AI Lecturer", ai: true },
  { n: "You", r: "Student" },
  { n: "Alex Johnson", r: "Student" },
  { n: "Maria Garcia", r: "Student" },
  { n: "James Wilson", r: "Student" },
];

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerP = spring({ frame, fps, config: { damping: 22, stiffness: 100 } });
  const leftP = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 90 } });
  const centerP = spring({ frame: frame - 14, fps, config: { damping: 22, stiffness: 80 } });
  const rightP = spring({ frame: frame - 20, fps, config: { damping: 22, stiffness: 90 } });

  // Avatar pulse for active speaker
  const speakerPulse = 0.7 + 0.3 * Math.abs(Math.sin(frame / 5));

  return (
    <AbsoluteFill style={{ padding: 40, background: "transparent" }}>
      {/* Top app bar */}
      <div
        style={{
          height: 84,
          background: "rgba(10,22,48,0.78)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 24,
          opacity: headerP,
          transform: `translateY(${interpolate(headerP, [0, 1], [-30, 0])}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.burgundy}, ${COLORS.burgundyGlow})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 0 1px ${COLORS.gold}`,
            }}
          >
            <span style={{ fontFamily: PLAYFAIR, fontSize: 26, color: COLORS.gold, fontWeight: 900 }}>S</span>
          </div>
          <div>
            <div style={{ fontFamily: PLAYFAIR, fontSize: 22, color: COLORS.ivory, fontWeight: 700, lineHeight: 1 }}>
              ScrollUniversity
            </div>
            <div style={{ fontFamily: DMSANS, fontSize: 11, color: COLORS.goldSoft, letterSpacing: 3, marginTop: 4 }}>
              VERITAS · SAPIENTIA · AETERNITAS
            </div>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: PLAYFAIR, fontSize: 30, color: COLORS.ivory, fontWeight: 700 }}>
            AI Live Classroom
          </span>
          <span
            style={{
              marginLeft: 14,
              padding: "5px 12px",
              borderRadius: 6,
              background: COLORS.liveRed,
              color: COLORS.ivory,
              fontFamily: DMSANS,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              verticalAlign: "middle",
            }}
          >
            LIVE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Chip label="CS-501 · Advanced Algorithms" />
          <Chip label="01:24:37" mono />
          <Chip label="24 students" />
        </div>
      </div>

      {/* 3-column body */}
      <div style={{ display: "flex", gap: 24, marginTop: 24, flex: 1 }}>
        {/* Left nav */}
        <div
          style={{
            width: 260,
            background: "rgba(10,22,48,0.72)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 18,
            padding: 20,
            opacity: leftP,
            transform: `translateX(${interpolate(leftP, [0, 1], [-40, 0])}px)`,
          }}
        >
          <p style={{ fontFamily: DMSANS, fontSize: 12, color: COLORS.goldSoft, letterSpacing: 3, margin: 0, marginBottom: 16 }}>
            CLASSROOM
          </p>
          {NAV.map((item, i) => {
            const active = i === 0;
            const ip = spring({ frame: frame - 20 - i * 4, fps, config: { damping: 22, stiffness: 110 } });
            return (
              <div
                key={item}
                style={{
                  padding: "12px 14px",
                  marginBottom: 4,
                  borderRadius: 10,
                  background: active ? `linear-gradient(90deg, ${COLORS.burgundy}, transparent)` : "transparent",
                  border: active ? `1px solid rgba(212,175,55,0.4)` : "1px solid transparent",
                  color: active ? COLORS.ivory : COLORS.ivoryMuted,
                  fontFamily: DMSANS,
                  fontSize: 16,
                  fontWeight: active ? 700 : 500,
                  opacity: ip,
                  transform: `translateX(${interpolate(ip, [0, 1], [-12, 0])}px)`,
                }}
              >
                {item}
              </div>
            );
          })}

          {/* progress ring */}
          <div
            style={{
              marginTop: 28,
              padding: 18,
              borderRadius: 14,
              border: `1px solid ${COLORS.border}`,
              background: "rgba(126,29,47,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <ProgressRing pct={75} />
            <div>
              <div style={{ fontFamily: DMSANS, fontSize: 13, color: COLORS.goldSoft, letterSpacing: 2 }}>SESSION</div>
              <div style={{ fontFamily: PLAYFAIR, fontSize: 22, color: COLORS.ivory, fontWeight: 700 }}>Progress</div>
            </div>
          </div>
        </div>

        {/* Center: video stage */}
        <div
          style={{
            flex: 1,
            background: "rgba(10,22,48,0.72)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 18,
            overflow: "hidden",
            position: "relative",
            opacity: centerP,
            transform: `scale(${interpolate(centerP, [0, 1], [0.96, 1])})`,
          }}
        >
          <Img
            src={staticFile("images/lecturer.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${interpolate(frame, [0, 190], [1.02, 1.08])})`,
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(5,11,31,0.1) 0%, rgba(5,11,31,0.0) 40%, rgba(5,11,31,0.85) 100%)",
            }}
          />

          {/* speaker chip */}
          <div
            style={{
              position: "absolute",
              top: 22,
              left: 22,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(10,22,48,0.85)",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: COLORS.success,
                boxShadow: `0 0 ${10 * speakerPulse}px ${COLORS.success}`,
              }}
            />
            <span style={{ fontFamily: DMSANS, fontSize: 14, color: COLORS.ivory, fontWeight: 500 }}>
              AI Lecturer · Live
            </span>
          </div>

          {/* control bar */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 26,
              transform: `translateX(-50%) translateY(${interpolate(centerP, [0, 1], [30, 0])}px)`,
              display: "flex",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(5,11,31,0.85)",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <CtrlBtn label="Unmute" tone="burgundy" />
            <CtrlBtn label="Stop Video" />
            <CtrlBtn label="Share" />
            <CtrlBtn label="Raise Hand" />
            <CtrlBtn label="Settings" />
            <CtrlBtn label="End" tone="red" />
          </div>
        </div>

        {/* Right column */}
        <div
          style={{
            width: 360,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            opacity: rightP,
            transform: `translateX(${interpolate(rightP, [0, 1], [40, 0])}px)`,
          }}
        >
          <Panel title="PARTICIPANTS · 24">
            {PARTICIPANTS.map((p, i) => {
              const pp = spring({ frame: frame - 35 - i * 6, fps, config: { damping: 22, stiffness: 110 } });
              return (
                <div
                  key={p.n}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: i < PARTICIPANTS.length - 1 ? `1px solid rgba(212,175,55,0.08)` : "none",
                    opacity: pp,
                    transform: `translateX(${interpolate(pp, [0, 1], [12, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: p.ai
                        ? `linear-gradient(135deg, ${COLORS.burgundy}, ${COLORS.gold})`
                        : `linear-gradient(135deg, #2C3E70, #1A2540)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: COLORS.ivory,
                      fontFamily: DMSANS,
                      fontWeight: 700,
                      fontSize: 14,
                      border: p.ai ? `1px solid ${COLORS.gold}` : "none",
                    }}
                  >
                    {p.n.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: DMSANS, fontSize: 15, color: COLORS.ivory, fontWeight: 500 }}>{p.n}</div>
                    <div style={{ fontFamily: DMSANS, fontSize: 12, color: COLORS.ivoryMuted }}>{p.r}</div>
                  </div>
                  {p.ai && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 5,
                        background: COLORS.gold,
                        color: COLORS.bgDeep,
                        fontFamily: DMSANS,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 1.5,
                      }}
                    >
                      AI
                    </span>
                  )}
                </div>
              );
            })}
          </Panel>

          <Panel title="LIVE QUIZ">
            <div style={{ fontFamily: DMSANS, fontSize: 14, color: COLORS.ivory, marginBottom: 12 }}>
              Best algorithm for shortest path in a weighted graph?
            </div>
            {[
              ["A.", "BFS", false],
              ["B.", "DFS", false],
              ["C.", "Dijkstra's Algorithm", true],
              ["D.", "A* Search", false],
            ].map(([k, v, ok], i) => {
              const qp = spring({ frame: frame - 70 - i * 8, fps, config: { damping: 22, stiffness: 110 } });
              return (
                <div
                  key={String(k)}
                  style={{
                    padding: "8px 12px",
                    marginBottom: 6,
                    borderRadius: 8,
                    background: ok ? "rgba(63,214,140,0.12)" : "rgba(255,255,255,0.04)",
                    border: ok ? `1px solid ${COLORS.success}` : `1px solid rgba(255,255,255,0.08)`,
                    fontFamily: DMSANS,
                    fontSize: 13,
                    color: ok ? COLORS.success : COLORS.ivoryMuted,
                    fontWeight: ok ? 700 : 500,
                    opacity: qp,
                    transform: `translateY(${interpolate(qp, [0, 1], [8, 0])}px)`,
                  }}
                >
                  {String(k)} {String(v)} {ok ? "  ✓" : ""}
                </div>
              );
            })}
          </Panel>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ label: string; mono?: boolean }> = ({ label, mono }) => (
  <div
    style={{
      padding: "8px 14px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${COLORS.border}`,
      fontFamily: mono ? "ui-monospace, Menlo, monospace" : DMSANS,
      fontSize: 14,
      color: COLORS.ivory,
      fontWeight: 500,
    }}
  >
    {label}
  </div>
);

const CtrlBtn: React.FC<{ label: string; tone?: "burgundy" | "red" }> = ({ label, tone }) => {
  const bg =
    tone === "red"
      ? COLORS.liveRed
      : tone === "burgundy"
      ? `linear-gradient(135deg, ${COLORS.burgundy}, ${COLORS.burgundyGlow})`
      : "rgba(255,255,255,0.06)";
  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: 999,
        background: bg,
        border: tone ? "none" : `1px solid ${COLORS.border}`,
        color: COLORS.ivory,
        fontFamily: DMSANS,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
};

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    style={{
      background: "rgba(10,22,48,0.72)",
      border: `1px solid ${COLORS.border}`,
      borderRadius: 18,
      padding: 20,
    }}
  >
    <p
      style={{
        fontFamily: DMSANS,
        fontSize: 12,
        color: COLORS.goldSoft,
        letterSpacing: 3,
        margin: 0,
        marginBottom: 12,
      }}
    >
      {title}
    </p>
    {children}
  </div>
);

const ProgressRing: React.FC<{ pct: number }> = ({ pct }) => {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={COLORS.gold}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={COLORS.ivory}
        fontSize="14"
        fontFamily={DMSANS}
        fontWeight={700}
      >
        {pct}%
      </text>
    </svg>
  );
};
