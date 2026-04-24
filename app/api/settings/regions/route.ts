import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTenantClient } from "@/lib/tenant-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const { data, error } = await db
    .from("regions")
    .select("id, name, name_uz, name_ru, slug, currency, timezone, center_lat, center_lon, is_active, sort_order, created_at")
    .order("sort_order")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ regions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const body = await req.json();
  const { name, name_uz, name_ru, slug, currency, timezone, center_lat, center_lon, is_active, sort_order } = body;

  if (!name || !slug || center_lat == null || center_lon == null) {
    return NextResponse.json({ error: "name, slug, center_lat, center_lon are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("regions")
    .insert({ name, name_uz: name_uz || null, name_ru: name_ru || null, slug, currency: currency || "UZS", timezone: timezone || "Asia/Tashkent", center_lat, center_lon, is_active: is_active ?? true, sort_order: sort_order ?? 0 })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
