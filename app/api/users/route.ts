import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const role = sp.get("role") ?? "";
  const q = sp.get("q")?.trim() ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("tax_users")
    .select(
      "id, first_name, last_name, username, phone, role, badge, total_rides, total_amount, is_deleted, created_at",
      { count: "exact" }
    )
    .order("total_rides", { ascending: false })
    .range(from, to);

  if (role) query = query.eq("role", role);

  if (q) {
    query = query.or(
      `phone.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,username.ilike.%${q}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [], total: count ?? 0 });
}
