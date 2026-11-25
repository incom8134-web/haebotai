import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const owner = "incom8134-web";
const credit = /(?:(?:co-authored-by:|generated (?:by|with))[^\n]*\b(?:claude|codex|copilot|gemini|anthropic|openai|chatgpt|cursor|ai)\b|(?:claude|codex)-session:|https:\/\/claude\.ai\/code\/session_)/i;
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const base = process.argv[2] || process.env.BASE_SHA;
const errors = [];

if (base && !/^[a-f0-9]{40}$/i.test(base)) {
  throw new Error("The base must be a full Git commit SHA.");
}

const commits = base && !/^0+$/.test(base)
  ? git("rev-list", `${base}..HEAD`).split("\n").filter(Boolean)
  : [git("rev-parse", "HEAD")];

for (const sha of commits) {
  const [author, email, message] = git("show", "-s", "--format=%an%x00%ae%x00%B", sha).split("\0");
  if (author !== owner || /(?:anthropic|openai|copilot)/i.test(email)) {
    errors.push(`${sha.slice(0, 12)}: commit author must be ${owner}.`);
  }
  if (credit.test(message)) errors.push(`${sha.slice(0, 12)}: remove automated-tool credit trailers or session links.`);
}

if (process.env.GITHUB_EVENT_PATH) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (credit.test(event.pull_request?.body || "")) errors.push("Pull request description contains an automated-tool credit.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Attribution verified for ${commits.length} commit(s).`);
}
