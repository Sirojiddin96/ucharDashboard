import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const regionId = req.nextUrl.searchParams.get("region_id");
  const excludeRegion = req.nextUrl.searchParams.get("exclude_region");
  const q = req.nextUrl.searchParams.get("q");

  let query = (supabase as any)
    .from("users")
    .select("id, full_name, phone, service_class, is_active, region_id")
    .eq("role", "driver")
    .order("full_name", { ascending: true });

  if (regionId) query = query.eq("region_id", regionId);
  if (excludeRegion) query = query.neq("region_id", excludeRegion);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

  query = query.limit(30);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drivers: data });
}
