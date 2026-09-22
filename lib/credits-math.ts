// Pure mirror of the decision logic in settle_generation_credits
// (supabase/migrations/0011_lock_down_credits_and_keys.sql) — kept in
// sync by hand. The actual guarantee (atomicity via `for update` row
// locking, and that this runs at all) lives in the SQL function itself
// and can only be verified against a real Postgres instance — see
// supabase/verify-security.sql, run on staging. This proves the
// arithmetic: a settlement never refunds more than was reserved, and a
// second call against an already-settled run is a no-op.

export interface SettlementInput {
  reserved: number;
  creditsUsed: number;
  alreadySettled: boolean;
}

export interface SettlementResult {
  used: number;
  refund: number;
  /** false when the run was already settled — the ledger was not touched. */
  applied: boolean;
}

export function computeSettlement({ reserved, creditsUsed, alreadySettled }: SettlementInput): SettlementResult {
  if (alreadySettled) return { used: 0, refund: 0, applied: false };
  const used = Math.min(Math.max(creditsUsed, 0), reserved);
  return { used, refund: reserved - used, applied: true };
}
