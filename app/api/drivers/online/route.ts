import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("driver_online_status")
    .select(
      `driver_id, is_online, lat, lon, updated_at,
       tax_users!driver_online_status_driver_id_fkey(
         id, first_name, last_name, phone
       )`
    )
    .eq("is_online", true)
    .not("lat", "is", null)
    .not("lon", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drivers: data ?? [] });
}
