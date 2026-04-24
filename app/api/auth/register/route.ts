import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { platformDb } from "@/lib/platform-db";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orgName, slug, email, password } = body as {
    orgName?: string;
    slug?: string;
    email?: string;
    password?: string;
  };

  if (!orgName || !slug || !email || !password) {
    return NextResponse.json(
      { error: "orgName, slug, email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Validate slug: lowercase letters, numbers, hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug may only contain lowercase letters, numbers and hyphens" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const { data: existingUser } = await platformDb
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  // Check if slug already taken
  const { data: existingOrg } = await platformDb
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingOrg) {
    return NextResponse.json(
      { error: "This slug is already taken" },
      { status: 409 }
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert user
  const { data: user, error: userError } = await platformDb
    .from("users")
    .insert({ email: normalizedEmail, password_hash: passwordHash })
    .select("id")
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }

  // Insert organization
  const { data: org, error: orgError } = await platformDb
    .from("organizations")
    .insert({ name: orgName.trim(), slug, plan: "free" })
    .select("id")
    .single();

  if (orgError || !org) {
    // Clean up user on org failure
    await platformDb.from("users").delete().eq("id", user.id);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }

  // Link user to org as owner
  const { error: memberError } = await platformDb
    .from("organization_members")
    .insert({ user_id: user.id, org_id: org.id, role: "owner" });

  if (memberError) {
    await platformDb.from("organizations").delete().eq("id", org.id);
    await platformDb.from("users").delete().eq("id", user.id);
    return NextResponse.json(
      { error: "Failed to set up organization membership" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
