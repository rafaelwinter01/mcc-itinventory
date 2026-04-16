// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { createHash, randomInt } from "crypto";
import { db } from "@/db";
import { systemUser, user as userTable } from "@/db/schema";
import { MAX_OTP_ATTEMPTS, OTP_EXPIRY_MINUTES } from "@/lib/auth-2fa";
import { eq } from "drizzle-orm";

function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function parsePreferencesObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

async function sendOtpEmail(email: string, code: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;
  const smtpSecure = process.env.SMTP_SECURE === "true";

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    throw new Error("SMTP settings are not configured");
  }

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
    subject: "MCC IT Inventory - Verification code",
    text: `Your verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: systemUser.id,
      userId: systemUser.userId,
      passwordHash: systemUser.passwordHash,
      isActive: systemUser.isActive,
      preferences: systemUser.preferences,
    })
    .from(systemUser)
    .where(eq(systemUser.username, username));

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const [person] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, user.userId))
    .limit(1);

  const email = person?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "No email associated with this account" }, { status: 400 });
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const preferencesObject = parsePreferencesObject(user.preferences);
  const sessionObject =
    preferencesObject.session && typeof preferencesObject.session === "object"
      ? (preferencesObject.session as Record<string, unknown>)
      : {};

  const updatedPreferences = {
    ...preferencesObject,
    session: {
      ...sessionObject,
      last: {
        codeHash,
        expiresAt,
        attempts: 0,
      },
    },
  };

  await db
    .update(systemUser)
    .set({ preferences: updatedPreferences })
    .where(eq(systemUser.id, user.id));

  await sendOtpEmail(email, code);

  return NextResponse.json({ pending2FA: true, username });
}
