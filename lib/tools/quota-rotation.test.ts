import assert from "node:assert";
import { test } from "node:test";
import { runWithRotation, type KeyRotationState, type RotationAction } from "./quota-rotation.ts";

// fn() stands in for a whole non-streaming generation (see the streaming
// decision in lib/ai/types.ts) — every retry below happens before any
// output would have reached a client, so there's no partial-output/
// mid-stream case to model here.

class FakeError extends Error {
  action: RotationAction;
  constructor(action: RotationAction) {
    super(action);
    this.action = action;
  }
}
const classify = (err: unknown) => (err instanceof FakeError ? err.action : "fail");

test("no error: calls fn once", async () => {
  const state: KeyRotationState = { keys: ["k1"], index: 0 };
  let calls = 0;
  const result = await runWithRotation(state, classify, async () => {
    calls++;
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("next-key: advances the index and returns the eventual success", async () => {
  const state: KeyRotationState = { keys: ["k1", "k2", "k3"], index: 0 };
  let calls = 0;
  const result = await runWithRotation(state, classify, async () => {
    calls++;
    if (calls < 3) throw new FakeError("next-key");
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 3);
  assert.equal(state.index, 2);
});

test("next-key: rethrows once every key has been tried", async () => {
  const state: KeyRotationState = { keys: ["k1", "k2"], index: 0 };
  let calls = 0;
  await assert.rejects(
    runWithRotation(state, classify, async () => {
      calls++;
      throw new FakeError("next-key");
    }),
  );
  assert.equal(calls, 2);
});

test("fail: does not retry even with keys left", async () => {
  const state: KeyRotationState = { keys: ["k1", "k2"], index: 0 };
  let calls = 0;
  await assert.rejects(
    runWithRotation(state, classify, async () => {
      calls++;
      throw new FakeError("fail");
    }),
  );
  assert.equal(calls, 1);
});

test("retry-same: retries the SAME key once before advancing", async () => {
  const state: KeyRotationState = { keys: ["k1", "k2"], index: 0 };
  let calls = 0;
  const result = await runWithRotation(state, classify, async () => {
    calls++;
    if (calls === 1) throw new FakeError("retry-same"); // 1st failure on k1: retry k1
    return "ok"; // 2nd call (still k1) succeeds
  });
  assert.equal(result, "ok");
  assert.equal(calls, 2);
  assert.equal(state.index, 0); // never advanced — the same-key retry worked
});

test("retry-same: advances to the next key if it fails twice in a row", async () => {
  const state: KeyRotationState = { keys: ["k1", "k2"], index: 0 };
  let calls = 0;
  const result = await runWithRotation(state, classify, async () => {
    calls++;
    if (calls < 3) throw new FakeError("retry-same"); // fails on k1 twice (1 retry), then k2 works
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 3);
  assert.equal(state.index, 1);
});

test("next-key-mark-broken: advances and reports the broken slot's index", async () => {
  const state: KeyRotationState = { keys: ["k1", "k2"], index: 0 };
  const broken: number[] = [];
  let calls = 0;
  const result = await runWithRotation(
    state,
    classify,
    async () => {
      calls++;
      if (calls === 1) throw new FakeError("next-key-mark-broken");
      return "ok";
    },
    { onBrokenKey: (index) => broken.push(index) },
  );
  assert.equal(result, "ok");
  assert.deepEqual(broken, [0]);
  assert.equal(state.index, 1);
});

test("next-key-mark-broken: still reports broken even on the last key before failing", async () => {
  const state: KeyRotationState = { keys: ["k1"], index: 0 };
  const broken: number[] = [];
  await assert.rejects(
    runWithRotation(
      state,
      classify,
      async () => {
        throw new FakeError("next-key-mark-broken");
      },
      { onBrokenKey: (index) => broken.push(index) },
    ),
  );
  assert.deepEqual(broken, [0]);
});

test("retry-same: waits using getRetryDelayMs before retrying, via an injected sleep", async () => {
  const state: KeyRotationState = { keys: ["k1"], index: 0 };
  const sleeps: number[] = [];
  const fakeSleep = async (ms: number) => {
    sleeps.push(ms);
  }; // never actually waits — the test must not take real time
  let calls = 0;
  const result = await runWithRotation(
    state,
    classify,
    async () => {
      calls++;
      if (calls === 1) throw new FakeError("retry-same");
      return "ok";
    },
    { getRetryDelayMs: () => 1500, sleep: fakeSleep },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [1500]);
});

test("retry-same: does not sleep when no getRetryDelayMs is given (Gemini's case)", async () => {
  const state: KeyRotationState = { keys: ["k1"], index: 0 };
  let sleepCalled = false;
  let calls = 0;
  await runWithRotation(
    state,
    classify,
    async () => {
      calls++;
      if (calls === 1) throw new FakeError("retry-same");
      return "ok";
    },
    { sleep: async () => { sleepCalled = true; } },
  );
  assert.equal(sleepCalled, false);
});
