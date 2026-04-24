import { createClient } from "@supabase/supabase-js";

// Platform database — stores organizations, users, org_members, tenant_databases.
// Server-side only.
export const platformDb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);
