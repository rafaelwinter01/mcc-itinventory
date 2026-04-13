import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { history, systemUser, user as userTable } from "@/db/schema";
import {
  PASSWORD_RESET_EXPIRY_MINUTES,
  PASSWORD_RESET_MAX_ATTEMPTS,
} from "@/lib/password-reset";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function sendResetEmail(email: string, username: string, token: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;
  const smtpSecure = process.env.SMTP_SECURE === "true";

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    throw new Error("SMTP settings are not configured");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

  const resetUrl = `${appUrl}/reset-password?username=${encodeURIComponent(
    username
  )}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject: "MCC IT Inventory - Password reset",
    text: `Use this link to reset your password: ${resetUrl}. The link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">Reset password</a></p><p>The link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.</p>`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!username || !email) {
      return NextResponse.json(
        { error: "username and email are required" },
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
      return NextResponse.json(
        { error: "Username/email combination not found" },
        { status: 404 }
      );
    }

    const [person] = await db
      .select({ id: userTable.id, email: userTable.email })
      .from(userTable)
      .where(and(eq(userTable.id, userRecord.userId), eq(userTable.email, email)))
      .limit(1);

    if (!person) {
      return NextResponse.json(
        { error: "Username/email combination not found" },
        { status: 404 }
      );
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const preferencesObject =
      userRecord.preferences && typeof userRecord.preferences === "object"
        ? (userRecord.preferences as Record<string, unknown>)
        : {};

    const sessionObject =
      preferencesObject.session && typeof preferencesObject.session === "object"
        ? (preferencesObject.session as Record<string, unknown>)
        : {};

    await db
      .update(systemUser)
      .set({
        preferences: {
          ...preferencesObject,
          session: {
            ...sessionObject,
            passwordReset: {
              tokenHash,
              expiresAt,
              attempts: 0,
            },
          },
        },
      })
      .where(eq(systemUser.id, userRecord.id));

    await sendResetEmail(email, username, rawToken);

    await db.insert(history).values({
      userId: userRecord.id,
      action: "UPDATE",
      entityName: "system_user",
      description: `Password reset requested for username ${username}`,
      entityId: userRecord.id,
    });

    return NextResponse.json(
      {
        ok: true,
        maxAttempts: PASSWORD_RESET_MAX_ATTEMPTS,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
