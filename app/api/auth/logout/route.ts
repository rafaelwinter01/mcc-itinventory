// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { session } from "@/db/schema";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

export async function POST() {
  const cookieStore = cookies();
  const sessionId = (await cookieStore).get("session_id")?.value;

  if (sessionId) {
    await db.delete(session).where(eq(session.id, sessionId));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("session_id");

  return res;
}
