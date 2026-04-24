import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/tenant-client";
import { getSession } from "@/lib/session";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getTenantClient(session.organizationId);

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const status = req.nextUrl.searchParams.get("status") ?? "";

  const cached = unstable_cache(
    async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = db
        .from("app_orders" as never)
        .select(
          "id, scat_uuid, phone, final_status, current_status, driver_name, car_number, amount, created_at, completed_at, channel, driver_reassignment_count",
          { count: "exact" }
        )
        .not("final_status", "is", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (status) query = query.eq("final_status", Number(status));

      return query;
    },
    ["orders-history-api-v1", String(page), status || "all"],
    { revalidate: 10, tags: ["orders"] }
  );

  const { data, count, error } = await cached();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [], total: count ?? 0 });
}
