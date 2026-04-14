import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemUser } from "@/db/schema";
import { MAX_OTP_ATTEMPTS } from "@/lib/auth-2fa";
import {
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/session";

type SessionLastChallenge = {
  codeHash?: unknown;
  expiresAt?: unknown;
  attempts?: unknown;
};

function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function clearSessionLast(preferences: unknown) {
  const preferencesObject =
    preferences && typeof preferences === "object"
      ? (preferences as Record<string, unknown>)
      : {};

  const sessionObject =
    preferencesObject.session && typeof preferencesObject.session === "object"
      ? (preferencesObject.session as Record<string, unknown>)
      : {};

  const nextSession = { ...sessionObject };
  delete nextSession.last;

  return {
    ...preferencesObject,
    session: nextSession,
  };
}

export async function POST(req: Request) {
  const isProduction = process.env.NODE_ENV === "production";
  const body = await req.json();
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!username || !code) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [user] = await db
    .select({
      id: systemUser.id,
      username: systemUser.username,
      isActive: systemUser.isActive,
      preferences: systemUser.preferences,
    })
    .from(systemUser)
    .where(eq(systemUser.username, username));

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const preferencesObject =
    user.preferences && typeof user.preferences === "object"
      ? (user.preferences as Record<string, unknown>)
      : {};

  const sessionObject =
    preferencesObject.session && typeof preferencesObject.session === "object"
      ? (preferencesObject.session as Record<string, unknown>)
      : {};

  const last =
    sessionObject.last && typeof sessionObject.last === "object"
      ? (sessionObject.last as SessionLastChallenge)
      : null;

  const codeHash = typeof last?.codeHash === "string" ? last.codeHash : null;
  const expiresAtRaw = typeof last?.expiresAt === "string" ? last.expiresAt : null;
  const attemptsRaw = Number(last?.attempts ?? 0);
  const attempts = Number.isFinite(attemptsRaw) ? attemptsRaw : 0;

  if (!codeHash || !expiresAtRaw) {
    return NextResponse.json(
      { error: "No active validation code. Start login again." },
      { status: 401 }
    );
  }

  const expiresAt = new Date(expiresAtRaw);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    await db
      .update(systemUser)
      .set({ preferences: clearSessionLast(user.preferences) })
      .where(eq(systemUser.id, user.id));

    return NextResponse.json(
      { error: "Validation code expired. Start login again." },
      { status: 401 }
    );
  }

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await db
      .update(systemUser)
      .set({ preferences: clearSessionLast(user.preferences) })
      .where(eq(systemUser.id, user.id));

    return NextResponse.json(
      { error: "Maximum attempts exceeded. Start login again." },
      { status: 401 }
    );
  }

  const inputHash = hashOtpCode(code);

  if (inputHash !== codeHash) {
    const nextAttempts = attempts + 1;

    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await db
        .update(systemUser)
        .set({ preferences: clearSessionLast(user.preferences) })
        .where(eq(systemUser.id, user.id));

      return NextResponse.json(
        { error: "Maximum attempts exceeded. Start login again." },
        { status: 401 }
      );
    }

    await db
      .update(systemUser)
      .set({
        preferences: {
          ...preferencesObject,
          session: {
            ...sessionObject,
            last: {
              ...last,
              attempts: nextAttempts,
            },
          },
        },
      })
      .where(eq(systemUser.id, user.id));

    return NextResponse.json({ error: "Invalid validation code" }, { status: 401 });
  }

  await db
    .update(systemUser)
    .set({
      preferences: clearSessionLast(user.preferences),
      lastLoginAt: new Date(),
    })
    .where(eq(systemUser.id, user.id));

  const sessionId = await createSession(user.id);

  const res = NextResponse.json({ ok: true });

  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return res;
}
