import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { history, systemUser } from "@/db/schema"

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const entityIdParam = searchParams.get("entityId")
		const entityName = searchParams.get("entityName")?.trim()

		if (!entityIdParam || !entityName) {
			return NextResponse.json(
				{ error: "entityId and entityName are required" },
				{ status: 400 }
			)
		}

		const entityId = Number(entityIdParam)

		if (!Number.isInteger(entityId) || entityId < 1) {
			return NextResponse.json(
				{ error: "entityId must be a valid positive integer" },
				{ status: 400 }
			)
		}

		const rows = await db
			.select({
				id: history.id,
				userId: history.userId,
				action: history.action,
				entityName: history.entityName,
				description: history.description,
				entityId: history.entityId,
				createdAt: history.createdAt,
				username: systemUser.username,
			})
			.from(history)
			.leftJoin(systemUser, eq(systemUser.userId, history.userId))
			.where(and(eq(history.entityId, entityId), eq(history.entityName, entityName)))
			.orderBy(desc(history.createdAt))


		return NextResponse.json(rows, { status: 200 })
	} catch (error) {
		console.error("Error fetching history:", error)
		return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
	}
}
