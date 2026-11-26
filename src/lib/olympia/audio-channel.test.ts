import test from "node:test";
import assert from "node:assert/strict";
import {
  applyChannelRoutingGraph,
  computeChannelGainMatrix,
  createChannelRoutingGraph,
} from "./audio-channel";

test("computeChannelGainMatrix: 'both' passes standard stereo without downmixing", () => {
  assert.deepEqual(computeChannelGainMatrix("both"), {
    L_to_L: 1.0,
    L_to_R: 0.0,
    R_to_L: 0.0,
    R_to_R: 1.0,
  });
});

test("computeChannelGainMatrix: 'left' duplicates Left channel to both L and R and mutes Right", () => {
  assert.deepEqual(computeChannelGainMatrix("left"), {
    L_to_L: 1.0,
    L_to_R: 1.0,
    R_to_L: 0.0,
    R_to_R: 0.0,
  });
});

test("computeChannelGainMatrix: 'right' duplicates Right channel to both L and R and mutes Left", () => {
  assert.deepEqual(computeChannelGainMatrix("right"), {
    L_to_L: 0.0,
    L_to_R: 0.0,
    R_to_L: 1.0,
    R_to_R: 1.0,
  });
});

test("applyChannelRoutingGraph ramps existing GainNodes immediately and resumes suspended AudioContext", () => {
  let resumed = false;
  const makeGain = () => {
    const calls: Array<{ val: number; time: number; ramp: number }> = [];
    return {
      connect() {},
      gain: {
        setTargetAtTime(val: number, time: number, ramp: number) {
          calls.push({ val, time, ramp });
        },
      },
      calls,
    };
  };
  const mockCtx: any = {
    state: "suspended",
    currentTime: 12.5,
    resume: async () => {
      resumed = true;
    },
    createChannelSplitter: () => ({ connect() {} }),
    createChannelMerger: () => ({ connect() {} }),
    createGain: () => makeGain(),
    destination: {},
  };

  const graph = createChannelRoutingGraph(mockCtx);
  assert.equal((graph.input as any).channelCount, 2);
  assert.equal((graph.input as any).channelCountMode, "explicit");
  assert.equal((graph.input as any).channelInterpretation, "speakers");
  applyChannelRoutingGraph(mockCtx, graph, "left", 0.015);
  assert.equal(resumed, true);
  assert.deepEqual((graph.gainL_to_L as any).calls.at(-1), { val: 1.0, time: 12.5, ramp: 0.015 });
  assert.deepEqual((graph.gainL_to_R as any).calls.at(-1), { val: 1.0, time: 12.5, ramp: 0.015 });
  assert.deepEqual((graph.gainR_to_L as any).calls.at(-1), { val: 0.0, time: 12.5, ramp: 0.015 });
  assert.deepEqual((graph.gainR_to_R as any).calls.at(-1), { val: 0.0, time: 12.5, ramp: 0.015 });

  applyChannelRoutingGraph(mockCtx, graph, "right", 0.015);
  assert.deepEqual((graph.gainL_to_L as any).calls.at(-1).val, 0.0);
  assert.deepEqual((graph.gainL_to_R as any).calls.at(-1).val, 0.0);
  assert.deepEqual((graph.gainR_to_L as any).calls.at(-1).val, 1.0);
  assert.deepEqual((graph.gainR_to_R as any).calls.at(-1).val, 1.0);

  applyChannelRoutingGraph(mockCtx, graph, "both", 0.015);
  assert.deepEqual((graph.gainL_to_L as any).calls.at(-1).val, 1.0);
  assert.deepEqual((graph.gainL_to_R as any).calls.at(-1).val, 0.0);
  assert.deepEqual((graph.gainR_to_L as any).calls.at(-1).val, 0.0);
  assert.deepEqual((graph.gainR_to_R as any).calls.at(-1).val, 1.0);
});
