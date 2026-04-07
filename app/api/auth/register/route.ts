import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { history, systemUser, user as userTable } from "@/db/schema";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const id = Number(body?.id);
		const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
		const invitationHash =
			typeof body?.invitationHash === "string" ? body.invitationHash.trim() : "";
		const username = typeof body?.username === "string" ? body.username.trim() : "";
		const password = typeof body?.password === "string" ? body.password : "";

		if (!Number.isInteger(id) || id <= 0 || !email || !invitationHash || !username || !password) {
			return NextResponse.json(
				{ error: "id, email, invitationHash, username and password are required" },
				{ status: 400 }
			);
		}

		if (username.length < 3 || username.length > 50) {
			return NextResponse.json(
				{ error: "Username must be between 3 and 50 characters" },
				{ status: 400 }
			);
		}

		if (password.length < 8) {
			return NextResponse.json(
				{ error: "Password must be at least 8 characters" },
				{ status: 400 }
			);
		}

		const [person] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(and(eq(userTable.id, id), eq(userTable.email, email)))
			.limit(1);

		if (!person) {
			return NextResponse.json(
				{ error: "Invitation data is invalid" },
				{ status: 400 }
			);
		}

		const [invitedSystemUser] = await db
			.select({
				id: systemUser.id,
				userId: systemUser.userId,
				invitationHash: systemUser.invitationHash,
				isActive: systemUser.isActive,
			})
			.from(systemUser)
			.where(and(eq(systemUser.userId, id), eq(systemUser.invitationHash, invitationHash)))
			.limit(1);

		if (!invitedSystemUser) {
			return NextResponse.json(
				{ error: "Invitation not found or already used" },
				{ status: 404 }
			);
		}

		const [usernameTaken] = await db
			.select({ id: systemUser.id })
			.from(systemUser)
			.where(eq(systemUser.username, username))
			.limit(1);

		if (usernameTaken && usernameTaken.id !== invitedSystemUser.id) {
			return NextResponse.json({ error: "Username already exists" }, { status: 409 });
		}

		const passwordHash = await bcrypt.hash(password, 10);

		await db
			.update(systemUser)
			.set({
				username,
				passwordHash,
				invitationHash: null,
				isActive: 1,
			})
			.where(eq(systemUser.id, invitedSystemUser.id));

		await db.insert(history).values({
			userId: invitedSystemUser.id,
			action: "UPDATE",
			entityName: "system_user",
			description: `Invitation accepted and account activated for user ${id}`,
			entityId: invitedSystemUser.id,
		});

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Error registering invited user:", error);
		return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
	}
}
