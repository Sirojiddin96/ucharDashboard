import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_STATUSES = ["approved", "rejected"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(value: unknown): value is AllowedStatus {
  return ALLOWED_STATUSES.includes(value as AllowedStatus);
}

// Map application service text → service_class enum value
const SERVICE_CLASS_MAP: Record<string, string> = {
  economy: "economy",
  econom: "economy",
  standard: "standard",
  comfort: "comfort",
  business: "business",
  minivan: "minivan",
  cargo: "cargo",
  intercity: "intercity",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = (body as Record<string, unknown>)?.status;

  if (!isAllowedStatus(status)) {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("driver_applications")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // On approval: try to set region_id + service_class on the linked user
  if (status === "approved") {
    const { data: app } = await supabase
      .from("driver_applications")
      .select("user_id, city, service")
      .eq("id", id)
      .single();

    if (app?.user_id) {
        const userUpdates: Record<string, unknown> = {
          role: "driver",
        };
      // Match service → service_class
      if (app.service) {
        const sc = SERVICE_CLASS_MAP[app.service.toLowerCase().trim()];
        if (sc) userUpdates.service_class = sc;
      }

      // Match city name → region (case-insensitive slug/name match)
      if (app.city) {
        const { data: region } = await supabase
          .from("regions")
          .select("id")
          .or(
            `name.ilike.${app.city},name_uz.ilike.${app.city},name_ru.ilike.${app.city},slug.ilike.${app.city}`
          )
          .limit(1)
          .maybeSingle();
        if (region) userUpdates.region_id = region.id;
      }

      if (Object.keys(userUpdates).length > 0) {
        await supabase.from("users").update(userUpdates).eq("id", app.user_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
