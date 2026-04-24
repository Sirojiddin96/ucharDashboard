import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTenantClient } from "@/lib/tenant-client";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "name", "currency", "base_fare", "per_km", "per_min_driving", "per_min_waiting",
    "minimum_fare", "cancellation_fee", "surge_multiplier", "surge_preset",
    "night_surcharge", "night_start_hour", "night_end_hour",
    "valid_from", "valid_to", "is_active",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { error } = await db.from("tariffs").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getTenantClient(session.organizationId);

  const { id } = await params;
  const { error } = await db.from("tariffs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
