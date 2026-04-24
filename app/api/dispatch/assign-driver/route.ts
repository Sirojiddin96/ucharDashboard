import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { getTenantClient } from "@/lib/tenant-client";

interface AssignDriverBody {
  order_id: string;
  driver_id: string; // users.id UUID
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getTenantClient(session.organizationId);

  let body: AssignDriverBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { order_id, driver_id } = body;
  if (!order_id || !driver_id) {
    return NextResponse.json(
      { error: "order_id and driver_id are required" },
      { status: 400 }
    );
  }

  // Verify order exists and is active
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, final_status, driver_id, driver_reassignment_count")
    .eq("id", order_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.final_status !== null) {
    return NextResponse.json(
      { error: "Cannot assign driver to a completed or cancelled order" },
      { status: 409 }
    );
  }

  // Look up driver user info
  const { data: driver, error: driverError } = await db
    .from("tax_users")
    .select("id, first_name, last_name, phone")
    .eq("id", driver_id)
    .single();

  if (driverError || !driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const driverName =
    [driver.first_name, driver.last_name].filter(Boolean).join(" ") ||
    driver.phone ||
    driver_id;

  const wasAlreadyAssigned = !!order.driver_id;
  const now = new Date().toISOString();

  // Update order
  const { error: updateError } = await db
    .from("orders")
    .update({
      driver_id,
      driver_name: driverName,
      driver_assigned_at: now,
      current_status: 3, // Driver Assigned
      driver_reassignment_count: wasAlreadyAssigned
        ? (order.driver_reassignment_count ?? 0) + 1
        : order.driver_reassignment_count,
    })
    .eq("id", order_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log assignment record
  const { error: assignError } = await db
    .from("order_driver_assignments")
    .insert({
      order_id,
      driver_id,
      driver_name: driverName,
      assigned_at: now,
    });

  if (assignError) {
    // Non-fatal — order is already updated
    console.error("order_driver_assignments insert failed:", assignError.message);
  }

  revalidateTag("orders", {});
  revalidateTag("overview", {});
  return NextResponse.json({ ok: true, driver_name: driverName });
}
