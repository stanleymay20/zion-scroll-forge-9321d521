import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";

// Persistent atmospheric layer: drifting navy gradient + soft bokeh + subtle grid
export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const driftX = interpolate(frame, [0, durationInFrames], [0, -60]);
  const driftY = interpolate(frame, [0, durationInFrames], [0, 30]);
  const pulse = 0.55 + 0.08 * Math.sin(frame / 28);

  return (
    <AbsoluteFill>
      {/* base radial */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 30% 20%, #122656 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)`,
        }}
      />
      {/* burgundy glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 40% at ${20 + driftX * 0.3}% ${75 + driftY * 0.2}%, rgba(126,29,47,0.45) 0%, rgba(126,29,47,0) 70%)`,
          opacity: pulse,
        }}
      />
      {/* gold glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(35% 30% at ${82 + driftX * 0.2}% ${22 + driftY * 0.3}%, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0) 70%)`,
          opacity: pulse,
        }}
      />
      {/* fine grid overlay */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,198,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(94,198,255,0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          transform: `translate(${driftX}px, ${driftY}px)`,
          maskImage: "radial-gradient(80% 70% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 50% 50%, black 40%, transparent 100%)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
