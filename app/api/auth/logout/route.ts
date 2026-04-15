// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { session } from "@/db/schema";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.toLowerCase();
  const isHttpsRequest = forwardedProto
    ? forwardedProto.split(",").some((proto) => proto.trim() === "https")
    : new URL(req.url).protocol === "https:";
  const cookieStore = cookies();
  const sessionId = (await cookieStore).get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.delete(session).where(eq(session.id, sessionId));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isHttpsRequest,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return res;
}
