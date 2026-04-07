import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { history, systemUser, user as userTable } from "@/db/schema";
import { getSession } from "@/lib/session";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;
const smtpSecure = process.env.SMTP_SECURE === "true";

async function sendInvitationEmail(email: string, userId: number, invitationHash: string) {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
	const inviteUrl = `${appUrl}/register?id=${encodeURIComponent(String(userId))}&email=${encodeURIComponent(email)}&invitationHash=${encodeURIComponent(invitationHash)}`;

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
		subject: "MCC IT Inventory - Complete your account setup",
		text: `Your access was requested. Open this link to finish your account setup: ${inviteUrl}`,
		html: `<p>Your access was requested.</p><p><a href="${inviteUrl}">Click here to complete your account setup</a></p>`,
	});
}

async function requireAdminSession() {
	const sessionUser = await getSession();

	if (!sessionUser) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (sessionUser.role !== "admin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	return null;
}

function generateInvitationHash() {
	const token = randomBytes(32).toString("hex");
	return createHash("sha256").update(token).digest("hex");
}

function normalizeUsernameBase(email: string) {
	const local = email.split("@")[0] ?? "";
	const cleaned = local.toLowerCase().replace(/[^a-z0-9._-]/g, "");
	return cleaned || "user";
}

async function generateUniquePendingUsername(email: string, userId: number) {
	const base = normalizeUsernameBase(email);

	for (let attempt = 0; attempt < 10; attempt += 1) {
		const suffix = attempt === 0 ? `${userId}` : `${userId}_${randomBytes(2).toString("hex")}`;
		const candidate = `invite_${base}_${suffix}`.slice(0, 100);

		const [existing] = await db
			.select({ id: systemUser.id })
			.from(systemUser)
			.where(eq(systemUser.username, candidate))
			.limit(1);

		if (!existing) {
			return candidate;
		}
	}

	throw new Error("Could not generate a unique username for invitation");
}

export async function POST(request: NextRequest) {
	try {
		const authError = await requireAdminSession();
		if (authError) {
			return authError;
		}

		const body = await request.json();
		const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
		const role = body?.role;
		const userId = Number(body?.userId);

		if (!email || !role || !Number.isInteger(userId) || userId <= 0) {
			return NextResponse.json(
				{ error: "email, role and userId are required" },
				{ status: 400 }
			);
		}

		if (role !== "admin" && role !== "common") {
			return NextResponse.json({ error: "Invalid role" }, { status: 400 });
		}

		if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
			return NextResponse.json(
				{ error: "SMTP settings are not configured" },
				{ status: 500 }
			);
		}

		const [person] = await db
			.select({ id: userTable.id, email: userTable.email })
			.from(userTable)
			.where(and(eq(userTable.id, userId), eq(userTable.email, email)))
			.limit(1);

		if (!person) {
			return NextResponse.json(
				{ error: "User/email combination not found" },
				{ status: 404 }
			);
		}

		const [existingSystemUser] = await db
			.select({
				id: systemUser.id,
				username: systemUser.username,
				isActive: systemUser.isActive,
			})
			.from(systemUser)
			.where(eq(systemUser.userId, userId))
			.limit(1);

		if (existingSystemUser) {
			if (existingSystemUser.isActive) {
				return NextResponse.json(
					{ error: "A system user already exists and is active for this user" },
					{ status: 409 }
				);
			}

			const invitationHash = generateInvitationHash();

			await db
				.update(systemUser)
				.set({
					invitationHash,
					role,
					isActive: 0,
				})
				.where(eq(systemUser.id, existingSystemUser.id));

			await sendInvitationEmail(email, userId, invitationHash);

			await db.insert(history).values({
				action: "UPDATE",
				entityName: "system_user_invite",
				description: `Resent invitation for user ${userId} (${email})`,
				entityId: userId,
			});

			return NextResponse.json(
				{
					ok: true,
					userId,
					email,
					role,
				},
				{ status: 200 }
			);
		}

		const invitationHash = generateInvitationHash();
		const pendingUsername = await generateUniquePendingUsername(email, userId);
		const temporaryPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

		await db.insert(systemUser).values({
			userId,
			username: pendingUsername,
			passwordHash: temporaryPasswordHash,
			invitationHash,
			role,
			isActive: 0,
		});

		await sendInvitationEmail(email, userId, invitationHash);

		await db.insert(history).values({
			action: "CREATE",
			entityName: "system_user_invite",
			description: `Created invitation for user ${userId} (${email})`,
			entityId: userId,
		});

		return NextResponse.json(
			{
				ok: true,
				userId,
				email,
				role,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating user invitation:", error);
		return NextResponse.json(
			{ error: "Failed to create invitation" },
			{ status: 500 }
		);
	}
}
