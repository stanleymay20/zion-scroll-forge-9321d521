import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS } from "../theme";
import { PLAYFAIR, DMSANS } from "../fonts";

const BULLETS = [
  "Depth First Search",
  "Breadth First Search",
  "Dijkstra's Algorithm",
  "A* Search Algorithm",
];

export const SceneLecturer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow Ken Burns on lecturer image
  const zoom = interpolate(frame, [0, 170], [1.06, 1.14]);
  const panX = interpolate(frame, [0, 170], [0, -20]);

  const overlayProg = spring({ frame: frame - 15, fps, config: { damping: 22, stiffness: 80 } });
  const titleProg = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 90 } });
  const speakingPulse = 0.7 + 0.3 * Math.abs(Math.sin(frame / 4));

  return (
    <AbsoluteFill>
      {/* Lecturer image with Ken Burns */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile("images/lecturer.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom}) translateX(${panX}px)`,
            filter: "saturate(1.05) contrast(1.05)",
          }}
        />
        {/* darker gradient to integrate with brand */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(5,11,31,0.55) 0%, rgba(5,11,31,0.15) 35%, rgba(5,11,31,0.85) 100%), radial-gradient(60% 60% at 30% 50%, rgba(126,29,47,0.18), transparent 70%)",
          }}
        />
      </AbsoluteFill>

      {/* Top status chip — "AI Lecturer is speaking" */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 22px",
          background: "rgba(10,22,48,0.7)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 999,
          backdropFilter: "blur(0px)",
          opacity: overlayProg,
          transform: `translateY(${interpolate(overlayProg, [0, 1], [-20, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: COLORS.success,
            boxShadow: `0 0 ${10 * speakingPulse}px ${COLORS.success}`,
          }}
        />
        <span style={{ fontFamily: DMSANS, fontSize: 22, color: COLORS.ivory, fontWeight: 500 }}>
          AI Lecturer is speaking
        </span>
        {/* mini waveform */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const h = 6 + 14 * Math.abs(Math.sin((frame + i * 7) / 5));
            return (
              <div
                key={i}
                style={{
                  width: 3,
                  height: h,
                  background: COLORS.blueGlow,
                  borderRadius: 2,
                  opacity: 0.85,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Live chip top-right */}
      <div
        style={{
          position: "absolute",
          top: 56,
          right: 80,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 18px",
          borderRadius: 999,
          background: "rgba(230,57,70,0.18)",
          border: "1px solid rgba(230,57,70,0.5)",
          opacity: overlayProg,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: COLORS.liveRed,
            opacity: 0.7 + 0.3 * Math.sin(frame / 6),
          }}
        />
        <span style={{ fontFamily: DMSANS, fontSize: 16, color: COLORS.ivory, letterSpacing: 3, fontWeight: 700 }}>
          LIVE
        </span>
      </div>

      {/* Whiteboard panel (left) */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 220,
          width: 580,
          padding: "32px 36px",
          background: "rgba(10,22,48,0.55)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 18,
          boxShadow: `0 20px 60px rgba(0,0,0,0.4), inset 0 0 80px rgba(94,198,255,0.05)`,
          opacity: titleProg,
          transform: `translateX(${interpolate(titleProg, [0, 1], [-60, 0])}px)`,
        }}
      >
        <h2
          style={{
            fontFamily: PLAYFAIR,
            fontSize: 56,
            color: COLORS.goldSoft,
            margin: 0,
            marginBottom: 22,
            fontStyle: "italic",
            letterSpacing: -1,
          }}
        >
          Graph Algorithms
        </h2>
        {BULLETS.map((b, i) => {
          const bp = spring({ frame: frame - 45 - i * 12, fps, config: { damping: 18, stiffness: 110 } });
          return (
            <div
              key={b}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 16,
                opacity: bp,
                transform: `translateX(${interpolate(bp, [0, 1], [-24, 0])}px)`,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.blueGlow }} />
              <span style={{ fontFamily: DMSANS, fontSize: 26, color: COLORS.ivory, fontWeight: 400 }}>
                {b}
              </span>
            </div>
          );
        })}
      </div>

      {/* Complexity card (right) */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 250,
          width: 380,
          padding: "26px 30px",
          background: "rgba(10,22,48,0.6)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 18,
          opacity: titleProg,
          transform: `translateX(${interpolate(titleProg, [0, 1], [60, 0])}px)`,
        }}
      >
        <p
          style={{
            fontFamily: DMSANS,
            fontSize: 14,
            color: COLORS.goldSoft,
            letterSpacing: 3,
            textTransform: "uppercase",
            margin: 0,
            marginBottom: 18,
          }}
        >
          Time Complexity
        </p>
        {[
          ["DFS", "O(V + E)"],
          ["BFS", "O(V + E)"],
          ["Dijkstra", "O((V+E) log V)"],
          ["A*", "O(b^d)"],
        ].map(([k, v], i) => {
          const rp = spring({ frame: frame - 60 - i * 10, fps, config: { damping: 18, stiffness: 110 } });
          return (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "10px 0",
                borderBottom: i < 3 ? `1px solid rgba(212,175,55,0.12)` : "none",
                opacity: rp,
              }}
            >
              <span style={{ fontFamily: DMSANS, fontSize: 22, color: COLORS.ivory, fontWeight: 500 }}>{k}</span>
              <span style={{ fontFamily: PLAYFAIR, fontSize: 22, color: COLORS.blueGlow, fontStyle: "italic" }}>{v}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom name plate */}
      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 80,
          padding: "20px 28px",
          background: "rgba(10,22,48,0.78)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          opacity: titleProg,
          transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: PLAYFAIR, fontSize: 28, color: COLORS.ivory, fontWeight: 700 }}>
              Dr. Elara Zion
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                background: `linear-gradient(90deg, ${COLORS.burgundy}, ${COLORS.burgundyGlow})`,
                color: COLORS.ivory,
                fontFamily: DMSANS,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              AI LECTURER
            </span>
          </div>
          <div style={{ fontFamily: DMSANS, fontSize: 16, color: COLORS.ivoryMuted, marginTop: 4 }}>
            Computer Science & AI · ScrollUniversity
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
