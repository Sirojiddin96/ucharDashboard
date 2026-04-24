/**
 * Migrates all API routes from the shared `supabase` singleton to
 * per-request `getTenantClient(session.organizationId)`.
 *
 * Run with: node scripts/migrate-to-tenant-client.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

// Routes with a standard dashboard session auth check — safe to migrate.
// (delete-account-request is a public endpoint — excluded intentionally)
const FILES = [
  "app/api/analytics/route.ts",
  "app/api/settings/services/route.ts",
  "app/api/settings/services/[id]/route.ts",
  "app/api/orders/active/route.ts",
  "app/api/orders/history/route.ts",
  "app/api/settings/service-types/route.ts",
  "app/api/settings/service-types/[id]/route.ts",
  "app/api/dispatch/data/route.ts",
  "app/api/dispatch/phone-lookup/route.ts",
  "app/api/dispatch/create-and-assign/route.ts",
  "app/api/dispatch/create-order/route.ts",
  "app/api/dispatch/drivers/route.ts",
  "app/api/dispatch/assign-driver/route.ts",
  "app/api/settings/region-service-tariffs/route.ts",
  "app/api/settings/region-service-tariffs/[id]/route.ts",
  "app/api/settings/drivers/route.ts",
  "app/api/driver-applications/[id]/route.ts",
  "app/api/users/route.ts",
  "app/api/settings/tariffs/route.ts",
  "app/api/settings/tariffs/[id]/route.ts",
  "app/api/settings/tariff-tiers/route.ts",
  "app/api/settings/tariff-tiers/[id]/route.ts",
  "app/api/settings/regions/route.ts",
  "app/api/settings/regions/[id]/route.ts",
  "app/api/settings/addresses/route.ts",
  "app/api/settings/addresses/[id]/route.ts",
  "app/api/drivers/[id]/route.ts",
  "app/api/drivers/online/route.ts",
];

let changed = 0;
let skipped = 0;

for (const rel of FILES) {
  const file = join(ROOT, rel);
  let src = readFileSync(file, "utf-8");
  const original = src;

  // 1. Swap the import
  src = src.replace(
    /import \{ supabase \} from "@\/lib\/supabase";/,
    'import { getTenantClient } from "@/lib/tenant-client";'
  );

  // 2a. Single-line auth check → inject const db after it
  //     e.g.:  if (!session.isLoggedIn) return NextResponse.json(...);
  src = src.replace(
    /(\n([ \t]+)if \(!session\.isLoggedIn\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);)/g,
    (_match, full, indent) =>
      full + `\n${indent}const db = await getTenantClient(session.organizationId);`
  );

  // 2b. Multi-line auth block → inject const db after closing brace
  //     e.g.:  if (!session.isLoggedIn) {
  //              return NextResponse.json(...);
  //            }
  src = src.replace(
    /(\n([ \t]+)if \(!session\.isLoggedIn\) \{\n[^\n]+\n[ \t]+\})/g,
    (_match, full, indent) =>
      full + `\n${indent}const db = await getTenantClient(session.organizationId);`
  );

  // 3. Replace all supabase.xxx with db.xxx
  src = src.replace(/\bsupabase(?=\.)/g, "db");

  if (src !== original) {
    writeFileSync(file, src, "utf-8");
    console.log("✓", rel);
    changed++;
  } else {
    console.log("⚠ unchanged:", rel);
    skipped++;
  }
}

console.log(`\nDone: ${changed} migrated, ${skipped} unchanged`);
