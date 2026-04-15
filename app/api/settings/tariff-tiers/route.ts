import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rstId = req.nextUrl.searchParams.get("rst_id");

  let query = supabase
    .from("tariff_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (rstId) query = query.eq("rst_id", rstId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tiers: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rst_id, from_km, to_km, pricing_type, rate, sort_order } = body;

  if (!rst_id || from_km === undefined || rate === undefined) {
    return NextResponse.json(
      { error: "rst_id, from_km, and rate are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tariff_tiers")
    .insert({
      rst_id,
      from_km,
      to_km: to_km ?? null,
      pricing_type: pricing_type ?? "per_km",
      rate,
      sort_order: sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tier: data }, { status: 201 });
}
