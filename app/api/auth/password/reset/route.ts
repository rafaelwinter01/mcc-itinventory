import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { history, session, systemUser, user as userTable } from "@/db/schema";
import { PASSWORD_RESET_MAX_ATTEMPTS } from "@/lib/password-reset";

type PasswordResetData = {
  tokenHash?: unknown;
  expiresAt?: unknown;
  attempts?: unknown;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function clearPasswordReset(preferences: unknown) {
  const preferencesObject =
    preferences && typeof preferences === "object"
      ? (preferences as Record<string, unknown>)
      : {};

  const sessionObject =
    preferencesObject.session && typeof preferencesObject.session === "object"
      ? (preferencesObject.session as Record<string, unknown>)
      : {};

  const nextSession = { ...sessionObject };
  delete nextSession.passwordReset;

  return {
    ...preferencesObject,
    session: nextSession,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!username || !email || !token || !newPassword) {
      return NextResponse.json(
        { error: "username, email, token and newPassword are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const [userRecord] = await db
      .select({
        id: systemUser.id,
        userId: systemUser.userId,
        isActive: systemUser.isActive,
        preferences: systemUser.preferences,
      })
      .from(systemUser)
      .where(eq(systemUser.username, username))
      .limit(1);

    if (!userRecord || !userRecord.isActive) {
      return NextResponse.json({ error: "Invalid reset request" }, { status: 400 });
    }

    const [person] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(eq(userTable.id, userRecord.userId), eq(userTable.email, email)))
      .limit(1);

    if (!person) {
      return NextResponse.json({ error: "Invalid reset request" }, { status: 400 });
    }

    const preferencesObject =
      userRecord.preferences && typeof userRecord.preferences === "object"
        ? (userRecord.preferences as Record<string, unknown>)
        : {};

    const sessionObject =
      preferencesObject.session && typeof preferencesObject.session === "object"
        ? (preferencesObject.session as Record<string, unknown>)
        : {};

    const passwordReset =
      sessionObject.passwordReset && typeof sessionObject.passwordReset === "object"
        ? (sessionObject.passwordReset as PasswordResetData)
        : null;

    const tokenHash =
      typeof passwordReset?.tokenHash === "string" ? passwordReset.tokenHash : null;
    const expiresAtRaw =
      typeof passwordReset?.expiresAt === "string" ? passwordReset.expiresAt : null;
    const attemptsRaw = Number(passwordReset?.attempts ?? 0);
    const attempts = Number.isFinite(attemptsRaw) ? attemptsRaw : 0;

    if (!tokenHash || !expiresAtRaw) {
      return NextResponse.json(
        { error: "Password reset request not found. Request a new one." },
        { status: 400 }
      );
    }

    const expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      await db
        .update(systemUser)
        .set({ preferences: clearPasswordReset(userRecord.preferences) })
        .where(eq(systemUser.id, userRecord.id));

      return NextResponse.json(
        { error: "Reset link expired. Request a new one." },
        { status: 400 }
      );
    }

    if (attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      await db
        .update(systemUser)
        .set({ preferences: clearPasswordReset(userRecord.preferences) })
        .where(eq(systemUser.id, userRecord.id));

      return NextResponse.json(
        { error: "Maximum attempts exceeded. Request a new link." },
        { status: 400 }
      );
    }

    const inputHash = hashToken(token);

    if (inputHash !== tokenHash) {
      const nextAttempts = attempts + 1;

      if (nextAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
        await db
          .update(systemUser)
          .set({ preferences: clearPasswordReset(userRecord.preferences) })
          .where(eq(systemUser.id, userRecord.id));

        return NextResponse.json(
          { error: "Maximum attempts exceeded. Request a new link." },
          { status: 400 }
        );
      }

      await db
        .update(systemUser)
        .set({
          preferences: {
            ...preferencesObject,
            session: {
              ...sessionObject,
              passwordReset: {
                ...passwordReset,
                attempts: nextAttempts,
              },
            },
          },
        })
        .where(eq(systemUser.id, userRecord.id));

      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(systemUser)
      .set({
        passwordHash,
        preferences: clearPasswordReset(userRecord.preferences),
      })
      .where(eq(systemUser.id, userRecord.id));

    await db.delete(session).where(eq(session.systemUserId, userRecord.id));

    await db.insert(history).values({
      userId: userRecord.id,
      action: "UPDATE",
      entityName: "system_user",
      description: `Password reset completed for username ${username}`,
      entityId: userRecord.id,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
