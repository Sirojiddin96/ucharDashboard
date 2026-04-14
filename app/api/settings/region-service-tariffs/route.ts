import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const regionId = req.nextUrl.searchParams.get("region_id");

  let query = supabase
    .from("region_service_tariffs")
    .select(
      "*, service_types(id, name, name_uz, name_ru, service_class, max_passengers, is_active), tariffs(id, name, per_km, per_min_driving, base_fare, minimum_fare, currency)"
    )
    .order("sort_order", { ascending: true });

  if (regionId) query = query.eq("region_id", regionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mappings: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { region_id, service_type_id, tariff_id, scat_rate_id, is_active, sort_order } = body;

  if (!region_id || !service_type_id) {
    return NextResponse.json({ error: "region_id and service_type_id are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("region_service_tariffs")
    .insert({
      region_id,
      service_type_id,
      tariff_id: tariff_id ?? null,
      scat_rate_id: scat_rate_id ?? null,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
    })
    .select(
      "*, service_types(id, name, service_class), tariffs(id, name, per_km, base_fare, currency)"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mapping: data }, { status: 201 });
}
