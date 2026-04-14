import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tariffs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tariffs: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, currency,
    base_fare, per_km, per_min_driving, per_min_waiting,
    minimum_fare, cancellation_fee,
    surge_multiplier, surge_preset,
    night_surcharge, night_start_hour, night_end_hour,
    valid_from, valid_to, is_active,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tariffs")
    .insert({
      name, currency: currency ?? "UZS",
      base_fare: base_fare ?? 0, per_km: per_km ?? 0,
      per_min_driving: per_min_driving ?? 0, per_min_waiting: per_min_waiting ?? 0,
      minimum_fare: minimum_fare ?? 0, cancellation_fee: cancellation_fee ?? 0,
      surge_multiplier: surge_multiplier ?? 1.0, surge_preset: surge_preset ?? "none",
      night_surcharge: night_surcharge ?? 0, night_start_hour: night_start_hour ?? 22, night_end_hour: night_end_hour ?? 6,
      valid_from: valid_from ?? null, valid_to: valid_to ?? null,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tariff: data }, { status: 201 });
}
