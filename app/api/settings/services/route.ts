import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTenantClient } from "@/lib/tenant-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const regionId = req.nextUrl.searchParams.get("region_id");
  let query = db.from("services").select("*").order("sort_order", { ascending: true });
  if (regionId) query = query.eq("region_id", regionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const body = await req.json();
  const { region_id, name, name_uz, name_ru, service_class, max_passengers, estimated_pickup_minutes, is_active, sort_order } = body;

  if (!region_id || !name || !service_class) {
    return NextResponse.json({ error: "region_id, name, and service_class are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("services")
    .insert({ region_id, name, name_uz, name_ru, service_class, max_passengers, estimated_pickup_minutes, is_active: is_active ?? true, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
