import { freeTierBlocked, freeTierDailyQuotaHit, isOverloaded, retryAfterSeconds } from "./provider-errors.ts";

// Free-tier Gemini keys (a Google project without billing) get several
// Flash models but not the Pro text model or the image models
// (ai.google.dev/gemini-api/docs/pricing). Each free model has its own
// small daily request quota (20 a day per model on the keys we tried),
// and Google turns free traffic away first when a model is busy.
// freeTierAware() wraps one model call so a free key still finishes a run:
// - a Pro text call refused as paid-only is re-sent on Flash;
// - when one free Flash model has used up today's quota, or stays busy
//   after waits of 3, 8 and 15 s, the call moves to the next free Flash
//   model (FREE_TEXT_MODELS), and the key skips that model for a while;
// - a short rate-limit wait Google asks for is honoured once.
// Paid keys never see these answers, so they behave as before. Image
// calls have no free model; their error (provider-errors.ts) says
// billing is needed.
//
// Pure apart from the clock and the wait, both injectable (tested).

/** Free text models, in the order a free key tries them. */
export const FREE_TEXT_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.7-flash"];

const PAID_ONLY_MS = 6 * 60 * 60 * 1000; // Pro refused: the key is free-tier
const DAILY_QUOTA_MS = 6 * 60 * 60 * 1000; // quotas reset daily (Pacific midnight)
const BUSY_MS = 10 * 60 * 1000;
const MAX_RATE_WAIT_S = 40;
const BUSY_WAITS_MS = [3_000, 8_000, 15_000];

// key tag → model → skip until (ms). A key with any entry is known free-tier.
const skipped = new Map<string, Map<string, number>>();

export const isProText = (model: string) => /-pro\b/.test(model) && !/image/.test(model);
const isText = (model: string) => !/image/.test(model);

export interface FreeTierOptions {
  /** Identifies the API key (a hash, never the key). */
  keyTag: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

type Params = { model: string; config?: { abortSignal?: AbortSignal } };

function skip(keyTag: string, model: string, until: number) {
  let m = skipped.get(keyTag);
  if (!m) {
    m = new Map();
    skipped.set(keyTag, m);
    if (skipped.size > 1000) skipped.delete(skipped.keys().next().value!);
  }
  m.set(model, until);
}

/** The model this call should use: the one asked for, or the first free one this key isn't skipping. */
function pick(keyTag: string, model: string, now: number): string | null {
  const m = skipped.get(keyTag);
  if (!m || !isText(model)) return model;
  const usable = (x: string) => (m.get(x) ?? 0) <= now;
  if (usable(model)) return model;
  return FREE_TEXT_MODELS.find(usable) ?? null;
}

export async function freeTierAware<P extends Params, R>(params: P, call: (p: P) => Promise<R>, opts: FreeTierOptions): Promise<R> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const aborted = () => !!params.config?.abortSignal?.aborted;
  let waited = false;
  let busyTries = 0;
  let lastErr: unknown;
  for (;;) {
    const model = pick(opts.keyTag, params.model, now());
    if (!model) throw lastErr; // every free model is used up or busy
    const p = model === params.model ? params : { ...params, model };
    try {
      return await call(p);
    } catch (err) {
      lastErr = err;
      if (freeTierBlocked(err) && isText(model)) {
        skip(opts.keyTag, model, now() + PAID_ONLY_MS);
        continue;
      }
      if (freeTierDailyQuotaHit(err) && isText(model)) {
        skip(opts.keyTag, model, now() + DAILY_QUOTA_MS);
        busyTries = 0;
        continue;
      }
      if (isOverloaded(err) && !aborted()) {
        if (busyTries < BUSY_WAITS_MS.length) {
          await sleep(BUSY_WAITS_MS[busyTries++]);
          continue;
        }
        // Still busy: a known free key moves on to another free model.
        if (skipped.has(opts.keyTag) && isText(model)) {
          skip(opts.keyTag, model, now() + BUSY_MS);
          busyTries = 0;
          continue;
        }
      }
      const wait = freeTierBlocked(err) ? null : retryAfterSeconds(err);
      if (!waited && wait !== null && wait <= MAX_RATE_WAIT_S && !aborted()) {
        waited = true;
        await sleep(wait * 1000 + 250);
        continue;
      }
      throw err;
    }
  }
}
