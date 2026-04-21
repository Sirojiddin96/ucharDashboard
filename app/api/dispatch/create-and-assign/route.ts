import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

interface Body {
  // Order fields
  phone: string;
  user_id?: string;
  telegram_user_id?: number;
  latitude: number;
  longitude: number;
  address?: string;
  region_id?: string;
  service_id?: string;
  note?: string;
  // Destination & fare
  dropoff_address?: string;
  distance_m?: number;
  estimated_fare?: number;
  // Optional immediate assignment
  driver_id?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    phone,
    user_id,
    telegram_user_id,
    latitude,
    longitude,
    address,
    region_id,
    service_id,
    note,
    dropoff_address,
    distance_m,
    estimated_fare,
    driver_id,
  } = body;

  if (!phone || typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json(
      { error: "phone, latitude, and longitude are required" },
      { status: 400 }
    );
  }

  // ── Resolve driver info if provided ─────────────────────────────────────
  let driverName: string | null = null;
  if (driver_id) {
    const { data: driver, error: driverErr } = await supabase
      .from("users")
      .select("id, first_name, last_name, phone")
      .eq("id", driver_id)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    driverName =
      [driver.first_name, driver.last_name].filter(Boolean).join(" ") ||
      driver.phone ||
      driver_id;
  }

  const now = new Date().toISOString();

  // ── Create order ─────────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      phone,
      user_id: user_id ?? null,
      telegram_user_id: telegram_user_id ?? null,
      latitude,
      longitude,
      address: address ?? null,
      dropoff_address: dropoff_address ?? null,
      region_id: region_id ?? null,
      service_id: service_id ?? null,
      note: note ?? null,
      channel: "call",
      current_status: driver_id ? 3 : 1, // 3 = Driver Assigned, 1 = Pending
      driver_id: driver_id ?? null,
      driver_name: driverName,
      driver_assigned_at: driver_id ? now : null,
    })
    .select("id")
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // ── Log assignment record if driver was assigned ─────────────────────────
  if (driver_id && driverName) {
    const { error: assignError } = await supabase
      .from("order_driver_assignments")
      .insert({
        order_id: order.id,
        driver_id,
        driver_name: driverName,
        assigned_at: now,
      });

    if (assignError) {
      console.error("order_driver_assignments insert failed:", assignError.message);
    }
  }

  // ── Call dispatch-order edge function ────────────────────────────────────
  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dispatch-order`;
  const edgeBody: Record<string, unknown> = {
    order_id: order.id,
    pickup_lat: latitude,
    pickup_lon: longitude,
    pickup_address: address ?? null,
    dropoff_address: dropoff_address ?? null,
    distance_m: distance_m ?? null,
    estimated_fare: estimated_fare ?? null,
  };
  if (driver_id) edgeBody.force_driver_id = driver_id;

  const edgeRes = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(edgeBody),
  });

  if (!edgeRes.ok) {
    const edgeErr = await edgeRes.text();
    console.error("dispatch-order edge function error:", edgeErr);
    return NextResponse.json(
      { error: `Order created but dispatch failed: ${edgeErr}` },
      { status: 502 }
    );
  }

  revalidateTag("orders", {});
  revalidateTag("overview", {});
  return NextResponse.json(
    { id: order.id, driver_assigned: !!driver_id, driver_name: driverName },
    { status: 201 }
  );
}
