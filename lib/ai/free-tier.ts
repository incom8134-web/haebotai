import { freeTierBlocked, retryAfterSeconds } from "./provider-errors.ts";

// Free-tier Gemini keys (a Google project without billing) get Flash but
// not the Pro text model or the image models, and a tight per-minute
// rate (ai.google.dev/gemini-api/docs/pricing). freeTierAware() wraps one
// model call:
// - a Pro text call refused as paid-only is re-sent on Flash, and that
//   key stays on Flash for a while so later calls skip the wasted try;
// - a short rate-limit wait Google asks for is honoured once.
// Image calls have no free model; their error (provider-errors.ts) says
// billing is needed.
//
// Pure apart from the clock and the wait, both injectable (tested).

const freeTierKeys = new Map<string, number>(); // key tag → until (ms)
const FREE_TIER_MEMORY_MS = 6 * 60 * 60 * 1000;
const MAX_RATE_WAIT_S = 40;

export const isProText = (model: string) => /-pro\b/.test(model) && !/image/.test(model);

export interface FreeTierOptions {
  /** Identifies the API key (a hash, never the key). */
  keyTag: string;
  flashModel: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

type Params = { model: string; config?: { abortSignal?: AbortSignal } };

export async function freeTierAware<P extends Params, R>(params: P, call: (p: P) => Promise<R>, opts: FreeTierOptions): Promise<R> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let waited = false;
  for (;;) {
    const onFlash = isProText(params.model) && (freeTierKeys.get(opts.keyTag) ?? 0) > now();
    const p = onFlash ? { ...params, model: opts.flashModel } : params;
    try {
      return await call(p);
    } catch (err) {
      if (freeTierBlocked(err) && isProText(p.model)) {
        freeTierKeys.set(opts.keyTag, now() + FREE_TIER_MEMORY_MS);
        if (freeTierKeys.size > 1000) freeTierKeys.delete(freeTierKeys.keys().next().value!);
        continue;
      }
      const wait = freeTierBlocked(err) ? null : retryAfterSeconds(err);
      if (!waited && wait !== null && wait <= MAX_RATE_WAIT_S && !p.config?.abortSignal?.aborted) {
        waited = true;
        await sleep(wait * 1000 + 250);
        continue;
      }
      throw err;
    }
  }
}
