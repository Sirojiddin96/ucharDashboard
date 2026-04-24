import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTenantClient } from "@/lib/tenant-client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getTenantClient(session.organizationId);

  const regionId = req.nextUrl.searchParams.get("region_id");

  const [regionsRes, servicesRes, addressesRes] = await Promise.all([
    db
      .from("regions")
      .select("id, name, name_ru, center_lat, center_lon, currency")
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("services")
      .select("id, name, name_ru, service_class, region_id, estimated_pickup_minutes")
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("default_addresses")
      .select("id, name, name_ru, short_name, address, latitude, longitude, category, region_id")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const regions = regionsRes.data ?? [];
  let services = servicesRes.data ?? [];
  let addresses = addressesRes.data ?? [];

  if (regionId) {
    services = services.filter((s) => s.region_id === regionId);
    addresses = addresses.filter((a) => a.region_id === regionId);
  }

  return NextResponse.json({ regions, services, addresses });
}
