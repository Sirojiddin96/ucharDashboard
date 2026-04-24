import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTenantClient } from "@/lib/tenant-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const { data, error } = await db
    .from("service_types")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service_types: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const body = await req.json();
  const { name, name_uz, name_ru, service_class, max_passengers, estimated_pickup_minutes, is_active, sort_order } = body;

  if (!name || !service_class) {
    return NextResponse.json({ error: "name and service_class are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("service_types")
    .insert({
      name, name_uz: name_uz ?? null, name_ru: name_ru ?? null,
      service_class,
      max_passengers: max_passengers ?? 4,
      estimated_pickup_minutes: estimated_pickup_minutes ?? null,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service_type: data }, { status: 201 });
}
