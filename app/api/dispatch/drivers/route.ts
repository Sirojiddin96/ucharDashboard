import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const regionId = req.nextUrl.searchParams.get("region_id") ?? null;

  // ── Phone/name search mode ────────────────────────────────────────────────
  if (q) {
    let query = supabase
      .from("tax_users")
      .select("id, first_name, last_name, phone")
      .eq("role", "driver")
      .eq("is_deleted", false)
      .or(`phone.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(20);
    if (regionId) query = query.eq("region_id", regionId);
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with online status
    const ids = (data ?? []).map((u) => u.id);
    const { data: online } = await supabase
      .from("driver_online_status")
      .select("driver_id, is_online, lat, lon, updated_at")
      .in("driver_id", ids);

    const onlineMap = new Map(
      (online ?? []).map((o) => [o.driver_id, o])
    );

    const drivers = (data ?? []).map((u) => ({
      ...u,
      is_online: onlineMap.get(u.id)?.is_online ?? false,
      lat: onlineMap.get(u.id)?.lat ?? null,
      lon: onlineMap.get(u.id)?.lon ?? null,
      distance_m: null as number | null,
    }));

    return NextResponse.json({ drivers });
  }

  // ── Nearby mode (requires lat/lon) ───────────────────────────────────────
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Provide lat & lon for nearby search, or q for name/phone search" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcParams: any = { p_lat: lat, p_lon: lon, p_radius_m: 10000, p_region_id: regionId || null };

  const { data: nearby, error: rpcError } = await supabase.rpc(
    "find_nearest_online_driver",
    rpcParams
  );

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  if (!nearby || nearby.length === 0) {
    return NextResponse.json({ drivers: [] });
  }

  const ids = nearby.map((n: { driver_id: string }) => n.driver_id);
  const distanceMap = new Map(
    nearby.map((n: { driver_id: string; distance_m: number }) => [n.driver_id, n.distance_m])
  );

  const { data: users, error: usersError } = await supabase
    .from("tax_users")
    .select("id, first_name, last_name, phone")
    .in("id", ids);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const { data: online } = await supabase
    .from("driver_online_status")
    .select("driver_id, lat, lon")
    .in("driver_id", ids);

  const onlineMap = new Map((online ?? []).map((o) => [o.driver_id, o]));

  const drivers = (users ?? [])
    .map((u) => ({
      ...u,
      is_online: true,
      lat: onlineMap.get(u.id)?.lat ?? null,
      lon: onlineMap.get(u.id)?.lon ?? null,
      distance_m: distanceMap.get(u.id) ?? null,
    }))
    .sort(
      (a, b) =>
        (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity)
    );

  return NextResponse.json({ drivers });
}
