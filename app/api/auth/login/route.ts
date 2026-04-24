import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { platformDb } from "@/lib/platform-db";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  // Look up user by email
  const { data: user } = await platformDb
    .from("users")
    .select("id, password_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!user) {
    // Constant-time: still run compare to prevent timing attacks
    await bcrypt.compare(password, "$2b$12$invalidhashfortimingprotection000000000000000000");
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Fetch org membership
  const { data: membership } = await platformDb
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "No organization found for this account" }, { status: 403 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.userId = user.id;
  session.organizationId = membership.org_id;
  session.role = membership.role as "owner" | "admin" | "dispatcher";
  await session.save();

  return NextResponse.json({ ok: true });
}

