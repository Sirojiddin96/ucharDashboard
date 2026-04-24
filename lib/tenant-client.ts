import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { platformDb } from "./platform-db";
import { decrypt } from "./crypto";
import type { Database } from "./database.types";

/**
 * Returns a Supabase client scoped to a specific organization's database.
 *
 * If the organization has configured their own database in tenant_databases,
 * those credentials are used. Otherwise falls back to the platform database
 * (useful during onboarding before a tenant DB is connected).
 */
export async function getTenantClient(
  organizationId: string
): Promise<SupabaseClient<Database>> {
  const { data } = await platformDb
    .from("tenant_databases")
    .select("supabase_url, supabase_service_key_enc")
    .eq("org_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) {
    // Org hasn't connected their own DB yet — use the platform DB
    return createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } }
    );
  }

  const serviceKey = decrypt(data.supabase_service_key_enc);
  return createClient<Database>(data.supabase_url, serviceKey, {
    auth: { persistSession: false },
  });
}
