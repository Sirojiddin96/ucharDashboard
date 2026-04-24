import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  isLoggedIn: boolean;
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "dispatcher";
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    password: process.env.SESSION_SECRET!,
    cookieName: "ucharbot_dash",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
    },
  });
}
