import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM for small secrets (user API keys). Output format:
// base64(iv).base64(tag).base64(ciphertext). The key is derived from
// API_KEY_ENCRYPTION_SECRET with SHA-256 so any sufficiently long secret
// string works. Pure node:crypto — testable without the app.

function deriveKey(secret: string) {
  if (!secret || secret.length < 16) throw new Error("API_KEY_ENCRYPTION_SECRET must be at least 16 characters");
  return createHash("sha256").update(secret).digest();
}

export function seal(plaintext: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64")).join(".");
}

export function open(sealed: string, secret: string): string {
  const [iv, tag, ciphertext] = sealed.split(".").map((part) => Buffer.from(part, "base64"));
  if (!iv?.length || !tag?.length || !ciphertext?.length) throw new Error("Malformed sealed value");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// Google AI Studio issues two live key shapes: the classic "AIza" + 35
// chars (39 total), and a newer "AQ." prefix some accounts/projects get
// instead — confirmed live in this project's own platform key
// (GOOGLE_GENAI_API_KEY in .env.local starts with "AQ."), and reported
// independently on the Google AI Developers forum (accounts that only
// ever generate "AQ."-prefixed keys, no "AIza" option). Rejecting the
// second shape would have refused this project's own key.
export function looksLikeGoogleKey(key: string) {
  const trimmed = key.trim();
  return /^AIza[0-9A-Za-z_-]{35}$/.test(trimmed) || /^AQ\.[0-9A-Za-z_-]{20,}$/.test(trimmed);
}

/** Anthropic keys start with "sk-ant-". */
export function looksLikeAnthropicKey(key: string) {
  return /^sk-ant-[0-9A-Za-z_-]{20,}$/.test(key.trim());
}

/** OpenAI keys start with "sk-" (checked after the more specific sk-ant- prefix). */
export function looksLikeOpenAIKey(key: string) {
  return /^sk-[0-9A-Za-z_-]{20,}$/.test(key.trim());
}
