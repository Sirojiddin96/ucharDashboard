import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const regionId = req.nextUrl.searchParams.get("region_id");
  let query = supabase.from("default_addresses").select("*").order("sort_order", { ascending: true });
  if (regionId) query = query.eq("region_id", regionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { region_id, name, name_uz, name_ru, short_name, address, latitude, longitude, category, icon_key, is_active, sort_order } = body;

  if (!region_id || !name || !latitude || !longitude) {
    return NextResponse.json({ error: "region_id, name, latitude, and longitude are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("default_addresses")
    .insert({ region_id, name, name_uz, name_ru, short_name, address, latitude, longitude, category: category ?? "other", icon_key, is_active: is_active ?? true, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ address: data }, { status: 201 });
}
