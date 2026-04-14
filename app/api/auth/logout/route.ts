// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { session } from "@/db/schema";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieStore = cookies();
  const sessionId = (await cookieStore).get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.delete(session).where(eq(session.id, sessionId));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return res;
}
