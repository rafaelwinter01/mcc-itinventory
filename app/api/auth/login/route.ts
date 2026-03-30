// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { systemUser } from "@/db/schema";
import {
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/session";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  console.log("Login attempt for user:", username);

  const [user] = await db
    .select()
    .from(systemUser)
    .where(eq(systemUser.username, username));

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionId = await createSession(user.id);

  const res = NextResponse.json({ ok: true });

  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return res;
}
