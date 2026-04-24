import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import { platformDb } from "@/lib/platform-db";
import { encrypt } from "@/lib/crypto";

/** GET — return current connection status for the session's org */
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await platformDb
    .from("tenant_databases")
    .select("supabase_url, supabase_anon_key, status, connected_at")
    .eq("org_id", session.organizationId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    supabase_url: data.supabase_url,
    supabase_anon_key: data.supabase_anon_key,
    status: data.status,
    connected_at: data.connected_at,
  });
}

/** POST — save or update the org's Supabase connection */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owners can update the database connection
  if (session.role !== "owner") {
    return NextResponse.json({ error: "Only owners can configure the database connection" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { supabaseUrl, serviceKey, anonKey } = body as {
    supabaseUrl?: string;
    serviceKey?: string;
    anonKey?: string;
  };

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "supabaseUrl and serviceKey are required" },
      { status: 400 }
    );
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid supabaseUrl" }, { status: 400 });
  }

  if (!parsedUrl.hostname.endsWith(".supabase.co")) {
    return NextResponse.json(
      { error: "supabaseUrl must be a *.supabase.co URL" },
      { status: 400 }
    );
  }

  // Verify the credentials actually work before saving
  const testClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { error: pingError } = await testClient.from("drivers").select("id").limit(1);
  if (pingError && pingError.code !== "PGRST116" && pingError.code !== "42P01") {
    // PGRST116 = no rows, 42P01 = table doesn't exist — both mean connection works
    return NextResponse.json(
      { error: "Could not connect with the provided credentials: " + pingError.message },
      { status: 422 }
    );
  }

  const encryptedServiceKey = encrypt(serviceKey);

  // Upsert (one row per org enforced by unique constraint on org_id)
  const { error } = await platformDb.from("tenant_databases").upsert(
    {
      org_id: session.organizationId,
      supabase_url: supabaseUrl.replace(/\/$/, ""), // strip trailing slash
      supabase_service_key_enc: encryptedServiceKey,
      supabase_anon_key: anonKey ?? null,
      status: "active",
      connected_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — disconnect the org's custom database */
export async function DELETE() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "owner") {
    return NextResponse.json({ error: "Only owners can remove the database connection" }, { status: 403 });
  }

  await platformDb
    .from("tenant_databases")
    .delete()
    .eq("org_id", session.organizationId);

  return NextResponse.json({ ok: true });
}
