#!/usr/bin/env node

/**
 * deploy.mjs — Trigger a Vercel production deploy via deploy hook.
 *
 * Usage:
 *   node scripts/deploy.mjs
 *   node scripts/deploy.mjs --env production   (default)
 *   node scripts/deploy.mjs --env preview
 *
 * The VERCEL_DEPLOY_HOOK env var must be set (in .env.development or shell).
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.development if running locally ─────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.development");

try {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // Running in CI — env vars come from the environment directly
}

// ── Resolve hook URL ──────────────────────────────────────────────────────────
const hookUrl = process.env.VERCEL_DEPLOY_HOOK;

if (!hookUrl || hookUrl.includes("REPLACE_WITH")) {
  console.error(
    "\n✖  VERCEL_DEPLOY_HOOK is not set.\n" +
    "   Add it to .env.development:\n" +
    "   VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/...\n" +
    "   Get it from: Vercel project → Settings → Git → Deploy Hooks\n"
  );
  process.exit(1);
}

// ── Fire the hook ─────────────────────────────────────────────────────────────
const branch = process.argv.includes("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : "production";

console.log(`\n🚀  Triggering Vercel deploy (branch: ${branch})…`);

const res = await fetch(hookUrl, { method: "POST" });

if (!res.ok) {
  const text = await res.text();
  console.error(`\n✖  Deploy hook failed [${res.status}]:\n${text}\n`);
  process.exit(1);
}

const data = await res.json().catch(() => ({}));
const jobId = data?.job?.id ?? "(unknown)";

console.log(`\n✔  Deploy triggered successfully!`);
console.log(`   Job ID : ${jobId}`);
console.log(`   Track  : https://vercel.com/dashboard\n`);
