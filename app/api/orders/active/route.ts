import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, scat_uuid, phone, current_status, driver_name, driver_id, car_number, car_color, car_brand, address, dropoff_address, note, latitude, longitude, dest_latitude, dest_longitude, channel, region_id, service_id, created_at, updated_at, driver_assigned_at, billing_started_at, driver_reassignment_count, amount, distance_m"
    )
    .is("final_status", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
