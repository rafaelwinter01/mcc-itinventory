/**
 * Bootstrap script — creates the first admin user.
 *
 * Run once after the first deployment (after migrations):
 *   npm run bootstrap-admin
 *
 * Required environment variables (.env.local or exported):
 *   DATABASE_URL
 *   BOOTSTRAP_ADMIN_EMAIL      — email that exists (or will be created) in the `user` table
 *   BOOTSTRAP_ADMIN_FIRSTNAME  — first name for the user record
 *   BOOTSTRAP_ADMIN_LASTNAME   — last name for the user record
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
 *   NEXT_PUBLIC_APP_URL or APP_URL  — base URL used in the invite link
 *
 * The script is idempotent: it does nothing if an active admin already exists.
 */
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { createHash, randomBytes } from "crypto";
// import { loadEnvConfig } from "@next/env";
import { history, systemUser, user as userTable } from "../db/schema";

// loadEnvConfig(process.cwd());

// ─── Guard: required env vars ────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_FIRSTNAME = process.env.BOOTSTRAP_ADMIN_FIRSTNAME?.trim();
const ADMIN_LASTNAME = process.env.BOOTSTRAP_ADMIN_LASTNAME?.trim();
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

const missing: string[] = [];
if (!DATABASE_URL) missing.push("DATABASE_URL");
if (!ADMIN_EMAIL) missing.push("BOOTSTRAP_ADMIN_EMAIL");
if (!ADMIN_FIRSTNAME) missing.push("BOOTSTRAP_ADMIN_FIRSTNAME");
if (!ADMIN_LASTNAME) missing.push("BOOTSTRAP_ADMIN_LASTNAME");
if (!SMTP_HOST) missing.push("SMTP_HOST");
if (!SMTP_USER) missing.push("SMTP_USER");
if (!SMTP_PASS) missing.push("SMTP_PASS");
if (!SMTP_FROM) missing.push("SMTP_FROM");

if (missing.length > 0) {
  console.error(`[bootstrap] Missing required environment variables:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

// ─── DB connection (standalone pool — not the Next.js singleton) ─────────────

const pool = mysql.createPool({
  uri: DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 5,
});

const db = drizzle(pool);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateInvitationHash() {
  return createHash("sha256").update(randomBytes(32).toString("hex")).digest("hex");
}

function generatePendingUsername(email: string, userId: number) {
  const local = email.split("@")[0] ?? "";
  const base = local.toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user";
  return `invite_${base}_${userId}`.slice(0, 100);
}

async function sendInvitationEmail(email: string, userId: number, invitationHash: string) {
  const inviteUrl = `${APP_URL}/register?id=${encodeURIComponent(
    String(userId)
  )}&email=${encodeURIComponent(email)}&invitationHash=${encodeURIComponent(invitationHash)}`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "MCC IT Inventory - Complete your admin account setup",
    text: `Your admin account has been created. Open this link to finish setup: ${inviteUrl}`,
    html: `<p>Your admin account has been created.</p><p><a href="${inviteUrl}">Click here to complete your account setup</a></p>`,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[bootstrap] Starting admin bootstrap...");

  // 1. Abort if active admin already exists
  const [existingAdmin] = await db
    .select({ id: systemUser.id })
    .from(systemUser)
    .where(and(eq(systemUser.role, "admin"), eq(systemUser.isActive, 1)))
    .limit(1);

  if (existingAdmin) {
    console.log("[bootstrap] Active admin already exists. Nothing to do.");
    await pool.end();
    process.exit(0);
  }

  // 2. Find or create the person in the `user` table
  const [existingPerson] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, ADMIN_EMAIL!))
    .limit(1);

  let personId: number;

  if (existingPerson) {
    personId = existingPerson.id;
    console.log(`[bootstrap] Found existing user record (id=${personId}) for ${ADMIN_EMAIL}.`);
  } else {
    await db.insert(userTable).values({
      firstname: ADMIN_FIRSTNAME!,
      lastname: ADMIN_LASTNAME!,
      email: ADMIN_EMAIL!,
    });

    const [newPerson] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, ADMIN_EMAIL!))
      .limit(1);

    personId = newPerson!.id;
    console.log(`[bootstrap] Created user record (id=${personId}) for ${ADMIN_EMAIL}.`);
  }

  // 3. Check if there is already an inactive system_user for this person
  const [existingSystemUser] = await db
    .select({ id: systemUser.id, isActive: systemUser.isActive })
    .from(systemUser)
    .where(eq(systemUser.userId, personId))
    .limit(1);

  if (existingSystemUser?.isActive) {
    console.log("[bootstrap] System user for this email is already active. Nothing to do.");
    await pool.end();
    process.exit(0);
  }

  const invitationHash = generateInvitationHash();
  const pendingUsername = generatePendingUsername(ADMIN_EMAIL!, personId);
  const temporaryPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  if (existingSystemUser) {
    // Reuse existing inactive record
    await db
      .update(systemUser)
      .set({ invitationHash, role: "admin", isActive: 0 })
      .where(eq(systemUser.id, existingSystemUser.id));

    console.log("[bootstrap] Updated existing inactive system_user record with new invite hash.");
  } else {
    // Create new record
    await db.insert(systemUser).values({
      userId: personId,
      username: pendingUsername,
      passwordHash: temporaryPasswordHash,
      invitationHash,
      role: "admin",
      isActive: 0,
    });

    console.log("[bootstrap] Created new system_user record (inactive, role=admin).");
  }

  // 4. Send invitation email
  await sendInvitationEmail(ADMIN_EMAIL!, personId, invitationHash);
  console.log(`[bootstrap] Invitation email sent to ${ADMIN_EMAIL}.`);

  // 5. Record in history
  await db.insert(history).values({
    action: "CREATE",
    entityName: "system_user_bootstrap",
    description: `Bootstrap admin invitation created for ${ADMIN_EMAIL}`,
    entityId: personId,
  });

  console.log("[bootstrap] Done. Admin invitation created successfully.");
  await pool.end();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("[bootstrap] Fatal error:", error);
  await pool.end();
  process.exit(1);
});
