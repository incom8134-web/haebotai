// Generic priority-key rotation: classify each error into one of four
// actions and retry fn() accordingly, in priority order. Provider-
// agnostic — Gemini uses the simple two-outcome case (its own classify
// only ever returns "next-key" or "fail"); Anthropic (lib/ai/anthropic.ts)
// uses the full four-category policy from the start.
//
// fn() wraps a WHOLE generation (lib/ai/types.ts: no adapter streams
// real tokens from its provider), so every retry here happens before
// route.ts has forwarded anything to the client — there is no mid-stream
// case to handle, and no risk of splicing two keys' output together.

export interface KeyRotationState {
  keys: string[];
  index: number;
}

// - "retry-same": transient (rate limit / overloaded) — wait, then retry
//   the SAME key once before giving up on it and advancing.
// - "next-key": this key's quota/billing is exhausted — advance now.
// - "next-key-mark-broken": key is invalid/revoked — advance now, and
//   the caller should flag that slot (onBrokenKey).
// - "fail": not rotatable (bad request, schema failure, network, ...) —
//   surface the error immediately.
export type RotationAction = "retry-same" | "next-key" | "next-key-mark-broken" | "fail";

export interface RotationOptions {
  onBrokenKey?: (index: number) => void;
  /** Delay before a same-key retry (e.g. a provider's retry-after header). Omit to retry immediately. */
  getRetryDelayMs?: (err: unknown) => number;
  /** Injectable for tests — defaults to a real setTimeout-based wait. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runWithRotation<T>(
  state: KeyRotationState,
  classify: (err: unknown) => RotationAction,
  fn: () => Promise<T>,
  options: RotationOptions = {},
): Promise<T> {
  const { onBrokenKey, getRetryDelayMs, sleep = defaultSleep } = options;
  let retriedCurrentKey = false;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const action = classify(err);

      if (action === "retry-same" && !retriedCurrentKey) {
        retriedCurrentKey = true;
        if (getRetryDelayMs) await sleep(getRetryDelayMs(err));
        continue;
      }

      const advancing = action === "next-key" || action === "next-key-mark-broken" || action === "retry-same";
      if (advancing && state.index < state.keys.length - 1) {
        if (action === "next-key-mark-broken") onBrokenKey?.(state.index);
        state.index++;
        retriedCurrentKey = false;
        continue;
      }

      if (action === "next-key-mark-broken") onBrokenKey?.(state.index);
      throw err;
    }
  }
}
