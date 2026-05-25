import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { PLAYFAIR, DMSANS } from "../fonts";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sealScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const sealRotate = interpolate(frame, [0, 120], [-8, 0]);
  const ring1 = interpolate(frame, [10, 70], [0, 1], { extrapolateRight: "clamp" });
  const ring2 = interpolate(frame, [25, 90], [0, 1], { extrapolateRight: "clamp" });

  const titleProg = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 90 } });
  const subProg = spring({ frame: frame - 38, fps, config: { damping: 18, stiffness: 90 } });
  const liveProg = spring({ frame: frame - 55, fps, config: { damping: 10 } });
  const livePulse = 0.85 + 0.15 * Math.sin(frame / 6);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* concentric rings */}
      <div style={{ position: "absolute", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {[ring1, ring2].map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 520 + i * 180,
              height: 520 + i * 180,
              borderRadius: "50%",
              border: `1px solid ${COLORS.gold}`,
              opacity: 0.18 * r,
              transform: `scale(${0.85 + 0.15 * r})`,
            }}
          />
        ))}
      </div>

      {/* Seal (stylized "S" inside hex) */}
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: 32,
          background: `linear-gradient(135deg, ${COLORS.burgundy}, ${COLORS.burgundyGlow})`,
          boxShadow: `0 30px 80px rgba(176,39,61,0.45), 0 0 0 2px ${COLORS.gold}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${sealScale}) rotate(${sealRotate}deg)`,
          marginBottom: 56,
        }}
      >
        <span
          style={{
            fontFamily: PLAYFAIR,
            fontSize: 140,
            fontWeight: 900,
            color: COLORS.gold,
            letterSpacing: -4,
            lineHeight: 1,
            textShadow: "0 4px 18px rgba(0,0,0,0.4)",
          }}
        >
          S
        </span>
      </div>

      <div style={{ overflow: "hidden", height: 130 }}>
        <h1
          style={{
            fontFamily: PLAYFAIR,
            fontSize: 96,
            color: COLORS.ivory,
            margin: 0,
            letterSpacing: -2,
            transform: `translateY(${interpolate(titleProg, [0, 1], [120, 0])}px)`,
            opacity: titleProg,
          }}
        >
          ScrollUniversity
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 24,
          opacity: subProg,
          transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{ height: 1, width: 90, background: COLORS.gold, opacity: 0.7 }} />
        <p
          style={{
            fontFamily: DMSANS,
            fontSize: 26,
            color: COLORS.goldSoft,
            margin: 0,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          AI Live Classroom
        </p>
        <div style={{ height: 1, width: 90, background: COLORS.gold, opacity: 0.7 }} />
      </div>

      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 22px",
          borderRadius: 999,
          background: "rgba(230,57,70,0.12)",
          border: `1px solid rgba(230,57,70,${0.4 * liveProg})`,
          opacity: liveProg,
          transform: `scale(${liveProg})`,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: COLORS.liveRed,
            opacity: livePulse,
            boxShadow: `0 0 ${12 * livePulse}px ${COLORS.liveRed}`,
          }}
        />
        <span style={{ fontFamily: DMSANS, fontSize: 18, color: COLORS.ivory, letterSpacing: 3, fontWeight: 700 }}>
          LIVE NOW
        </span>
      </div>
    </AbsoluteFill>
  );
};
