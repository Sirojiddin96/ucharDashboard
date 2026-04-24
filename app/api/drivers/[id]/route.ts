import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { getTenantClient } from "@/lib/tenant-client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getTenantClient(session.organizationId);

  const { id } = await params;

  const [
    { data: user, error: userError },
    { data: onlineStatus },
    { data: wallet },
    { data: rating },
    { data: transactions },
    { data: recentOrders },
    { data: application },
  ] = await Promise.all([
    db
      .from("tax_users")
      .select("id, first_name, last_name, username, phone, role, source, badge, total_rides, total_amount, total_ride_minutes, created_at, is_deleted")
      .eq("id", id)
      .single(),
    db
      .from("driver_online_status")
      .select("is_online, lat, lon, updated_at")
      .eq("driver_id", id)
      .maybeSingle(),
    db
      .from("wallets")
      .select("balance, reserved, updated_at")
      .eq("user_id", id)
      .maybeSingle(),
    db
      .from("app_driver_ratings" as never)
      .select("avg_rating, total_feedbacks")
      .eq("driver_id", id)
      .maybeSingle(),
    db
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, note, order_id, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("app_orders" as never)
      .select("id, phone, current_status, final_status, amount, created_at, channel, address")
      .eq("driver_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("driver_applications")
      .select("id, status, created_at, city, service, car_reg_number")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (userError || !user) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({
    user,
    onlineStatus: onlineStatus ?? null,
    wallet: wallet ?? null,
    rating: rating ?? null,
    transactions: transactions ?? [],
    recentOrders: recentOrders ?? [],
    application: application ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getTenantClient(session.organizationId);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── users table fields ────────────────────────────────────────────────────
  const USER_FIELDS = [
    "first_name",
    "last_name",
    "username",
    "phone",
    "role",
    "region_id",
    "service_class",
  ];
  const VALID_ROLES = ["driver", "courier", "admin"];

  const userUpdates: Record<string, unknown> = {};
  for (const key of USER_FIELDS) {
    if (key in body) userUpdates[key] = body[key] ?? null;
  }

  if ("role" in userUpdates && !VALID_ROLES.includes(userUpdates.role as string)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // ── driver_applications table fields ─────────────────────────────────────
  const APP_FIELDS = [
    "service",
    "car_brand_dispatcher",
    "car_color_dispatcher",
    "car_reg_number",
    "call_sign",
    "connection_type",
    "driver_license",
  ];

  const appUpdates: Record<string, unknown> = {};
  for (const key of APP_FIELDS) {
    if (key in body) appUpdates[key] = body[key] ?? null;
  }
  const appId = typeof body.app_id === "string" ? body.app_id : null;

  // ── Validate at least one update ─────────────────────────────────────────
  const hasUserUpdates = Object.keys(userUpdates).length > 0;
  const hasAppUpdates = appId !== null && Object.keys(appUpdates).length > 0;

  if (!hasUserUpdates && !hasAppUpdates) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // ── Apply users update ────────────────────────────────────────────────────
  if (hasUserUpdates) {
    const { error } = await db.from("tax_users").update(userUpdates).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── Apply driver_applications update ─────────────────────────────────────
  if (hasAppUpdates) {
    const { error } = await db
      .from("driver_applications")
      .update(appUpdates)
      .eq("id", appId!)
      .eq("user_id", id); // safety: ensure app belongs to this driver
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  revalidateTag("overview", {});
  return NextResponse.json({ ok: true });
}
