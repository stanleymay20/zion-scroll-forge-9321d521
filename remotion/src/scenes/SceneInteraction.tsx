import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { PLAYFAIR, DMSANS } from "../fonts";

const MESSAGES = [
  { who: "Alex Johnson", role: "Student", t: "Can you explain BFS vs DFS one more time?", ai: false },
  { who: "Dr. Elara Zion", role: "AI Lecturer", t: "Great question. BFS explores level by level; DFS dives as deep as possible before backtracking.", ai: true },
  { who: "Maria Garcia", role: "Student", t: "Could you show an example of Dijkstra's algorithm?", ai: false },
];

export const SceneInteraction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headP = spring({ frame, fps, config: { damping: 22, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <div
        style={{
          fontFamily: DMSANS,
          fontSize: 14,
          color: COLORS.goldSoft,
          letterSpacing: 4,
          marginBottom: 14,
          opacity: headP,
        }}
      >
        CLASSROOM CHAT · LIVE
      </div>
      <h2
        style={{
          fontFamily: PLAYFAIR,
          fontSize: 64,
          color: COLORS.ivory,
          margin: 0,
          marginBottom: 40,
          opacity: headP,
          transform: `translateY(${interpolate(headP, [0, 1], [20, 0])}px)`,
        }}
      >
        Real interaction. <span style={{ color: COLORS.goldSoft, fontStyle: "italic" }}>Real understanding.</span>
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1100 }}>
        {MESSAGES.map((m, i) => {
          const mp = spring({ frame: frame - 20 - i * 28, fps, config: { damping: 20, stiffness: 90 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                padding: 22,
                background: m.ai ? "rgba(126,29,47,0.18)" : "rgba(10,22,48,0.7)",
                border: `1px solid ${m.ai ? "rgba(212,175,55,0.4)" : COLORS.border}`,
                borderRadius: 18,
                opacity: mp,
                transform: `translateY(${interpolate(mp, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: m.ai
                    ? `linear-gradient(135deg, ${COLORS.burgundy}, ${COLORS.gold})`
                    : "linear-gradient(135deg, #2C3E70, #1A2540)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: DMSANS,
                  fontWeight: 700,
                  color: COLORS.ivory,
                  border: m.ai ? `1px solid ${COLORS.gold}` : "none",
                  flexShrink: 0,
                }}
              >
                {m.who.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: PLAYFAIR, fontSize: 22, color: COLORS.ivory, fontWeight: 700 }}>
                    {m.who}
                  </span>
                  {m.ai && (
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
                  <span style={{ fontFamily: DMSANS, fontSize: 13, color: COLORS.ivoryMuted }}>{m.role}</span>
                </div>
                <div style={{ fontFamily: DMSANS, fontSize: 22, color: COLORS.ivory, lineHeight: 1.5 }}>{m.t}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
