import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

interface CreateOrderBody {
  phone: string;
  user_id?: string;
  telegram_user_id?: number;
  latitude: number;
  longitude: number;
  address?: string;
  region_id?: string;
  service_id?: string;
  note?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateOrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, user_id, telegram_user_id, latitude, longitude, address, region_id, service_id } = body;

  if (!phone || typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json(
      { error: "phone, latitude, and longitude are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      phone,
      user_id: user_id ?? null,
      telegram_user_id: telegram_user_id ?? null,
      latitude,
      longitude,
      address: address ?? null,
      region_id: region_id ?? null,
      service_id: service_id ?? null,
      channel: "call",
      current_status: 1,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("orders", {});
  revalidateTag("overview", {});
  return NextResponse.json({ id: data.id }, { status: 201 });
}
