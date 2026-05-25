import React from "react";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadDm } from "@remotion/google-fonts/DMSans";

const { fontFamily: playfairFamily } = loadPlayfair("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});
const { fontFamily: dmFamily } = loadDm("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const PLAYFAIR = playfairFamily;
export const DMSANS = dmFamily;
