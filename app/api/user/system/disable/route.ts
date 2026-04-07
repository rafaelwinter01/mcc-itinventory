import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { history, systemUser } from "@/db/schema";
import { getSession } from "@/lib/session";

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

export async function POST(request: NextRequest) {
	try {
		const authError = await requireAdminSession();
		if (authError) {
			return authError;
		}

		const body = await request.json();
		const userId = Number(body?.userId);

		if (!Number.isInteger(userId) || userId <= 0) {
			return NextResponse.json({ error: "userId is required" }, { status: 400 });
		}

		const [existingSystemUser] = await db
			.select({ id: systemUser.id, isActive: systemUser.isActive })
			.from(systemUser)
			.where(eq(systemUser.userId, userId))
			.limit(1);

		if (!existingSystemUser) {
			return NextResponse.json({ error: "System user not found" }, { status: 404 });
		}

		if (!existingSystemUser.isActive) {
			return NextResponse.json({ ok: true }, { status: 200 });
		}

		await db
			.update(systemUser)
			.set({ isActive: 0 })
			.where(eq(systemUser.id, existingSystemUser.id));

		await db.insert(history).values({
			action: "UPDATE",
			entityName: "system_user",
			description: `Disabled system user for user ${userId}`,
			entityId: existingSystemUser.id,
		});

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Error disabling system user:", error);
		return NextResponse.json({ error: "Failed to disable system user" }, { status: 500 });
	}
}
