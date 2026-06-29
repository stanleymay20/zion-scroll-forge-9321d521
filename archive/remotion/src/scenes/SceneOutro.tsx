import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { PLAYFAIR, DMSANS } from "../fonts";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p1 = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const p2 = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 90 } });
  const p3 = spring({ frame: frame - 36, fps, config: { damping: 18, stiffness: 90 } });
  const line = interpolate(frame, [20, 90], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: DMSANS,
          fontSize: 18,
          color: COLORS.goldSoft,
          letterSpacing: 8,
          textTransform: "uppercase",
          opacity: p1,
          marginBottom: 24,
        }}
      >
        The Future of Learning
      </div>
      <h1
        style={{
          fontFamily: PLAYFAIR,
          fontSize: 110,
          color: COLORS.ivory,
          margin: 0,
          textAlign: "center",
          letterSpacing: -3,
          lineHeight: 1.05,
          opacity: p2,
          transform: `translateY(${interpolate(p2, [0, 1], [30, 0])}px)`,
        }}
      >
        ScrollUniversity
        <br />
        <span style={{ color: COLORS.goldSoft, fontStyle: "italic" }}>AI Live Classroom</span>
      </h1>

      <div
        style={{
          marginTop: 36,
          width: 280 * line,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
        }}
      />

      <p
        style={{
          marginTop: 28,
          fontFamily: DMSANS,
          fontSize: 24,
          color: COLORS.ivoryMuted,
          opacity: p3,
          textAlign: "center",
        }}
      >
        Veritas · Sapientia · Aeternitas
      </p>
    </AbsoluteFill>
  );
};
