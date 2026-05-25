import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { PersistentBackground } from "./components/PersistentBackground";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneLecturer } from "./scenes/SceneLecturer";
import { SceneDashboard } from "./scenes/SceneDashboard";
import { SceneInteraction } from "./scenes/SceneInteraction";
import { SceneOutro } from "./scenes/SceneOutro";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#050B1F", overflow: "hidden" }}>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={170}>
          <SceneLecturer />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })}
        />
        <TransitionSeries.Sequence durationInFrames={190}>
          <SceneDashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })}
        />
        <TransitionSeries.Sequence durationInFrames={170}>
          <SceneInteraction />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
