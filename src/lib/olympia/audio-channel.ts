export type OlympiaAudioChannel = "both" | "left" | "right";

export interface ChannelGainMatrix {
  L_to_L: number;
  L_to_R: number;
  R_to_L: number;
  R_to_R: number;
}

export interface ChannelRoutingGraph {
  splitter: ChannelSplitterNode;
  merger: ChannelMergerNode;
  gainL_to_L: GainNode;
  gainL_to_R: GainNode;
  gainR_to_L: GainNode;
  gainR_to_R: GainNode;
}

/**
 * Computes the 2x2 channel routing gain matrix:
 * - "both": Standard stereo pass-through (L->L=1, R->R=1, cross=0).
 * - "left": Duplicate Left input channel to both Left & Right speakers (mute Right input).
 * - "right": Duplicate Right input channel to both Left & Right speakers (mute Left input).
 */
export function computeChannelGainMatrix(
  channel: OlympiaAudioChannel | string | null | undefined
): ChannelGainMatrix {
  if (channel === "left") {
    return { L_to_L: 1.0, L_to_R: 1.0, R_to_L: 0.0, R_to_R: 0.0 };
  }
  if (channel === "right") {
    return { L_to_L: 0.0, L_to_R: 0.0, R_to_L: 1.0, R_to_R: 1.0 };
  }
  return { L_to_L: 1.0, L_to_R: 0.0, R_to_L: 0.0, R_to_R: 1.0 };
}

export function getStoredOlympiaAudioChannel(): OlympiaAudioChannel {
  if (typeof window === "undefined") return "both";
  try {
    const val = window.localStorage?.getItem("olympia_audio_channel");
    if (val === "left" || val === "right" || val === "both") return val;
  } catch {}
  return "both";
}

export function createChannelRoutingGraph(
  ctx: AudioContext,
  destination?: AudioNode
): ChannelRoutingGraph {
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const gainL_to_L = ctx.createGain();
  const gainL_to_R = ctx.createGain();
  const gainR_to_L = ctx.createGain();
  const gainR_to_R = ctx.createGain();

  splitter.connect(gainL_to_L, 0);
  gainL_to_L.connect(merger, 0, 0);

  splitter.connect(gainL_to_R, 0);
  gainL_to_R.connect(merger, 0, 1);

  splitter.connect(gainR_to_L, 1);
  gainR_to_L.connect(merger, 0, 0);

  splitter.connect(gainR_to_R, 1);
  gainR_to_R.connect(merger, 0, 1);

  merger.connect(destination || ctx.destination);

  return {
    splitter,
    merger,
    gainL_to_L,
    gainL_to_R,
    gainR_to_L,
    gainR_to_R,
  };
}

export function applyChannelRoutingGraph(
  ctx: AudioContext,
  graph: ChannelRoutingGraph,
  channel: OlympiaAudioChannel | string | null | undefined,
  rampTime: number = 0.015
): void {
  if (ctx.state === "suspended" && typeof ctx.resume === "function") {
    void ctx.resume().catch(() => {});
  }
  const m = computeChannelGainMatrix(channel);
  const now = ctx.currentTime;
  const setGain = (node: GainNode, val: number) => {
    if (typeof node?.gain?.setTargetAtTime === "function") {
      node.gain.setTargetAtTime(val, now, rampTime);
    } else if (node?.gain) {
      node.gain.value = val;
    }
  };
  setGain(graph.gainL_to_L, m.L_to_L);
  setGain(graph.gainL_to_R, m.L_to_R);
  setGain(graph.gainR_to_L, m.R_to_L);
  setGain(graph.gainR_to_R, m.R_to_R);
}
