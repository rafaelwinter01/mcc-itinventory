import { NextResponse } from "next/server"
import { db } from "@/db"
import { device, history, license, user, workstation } from "@/db/schema"
import { desc, eq, sql } from "drizzle-orm"

export async function GET() {
	try {
		const [deviceCount, workstationCount, userCount, licenseCount] = await Promise.all([
			db.select({ total: sql<number>`count(*)` }).from(device),
			db.select({ total: sql<number>`count(*)` }).from(workstation),
			db.select({ total: sql<number>`count(*)` }).from(user),
			db.select({ total: sql<number>`count(*)` }).from(license),
		])

		const recentHistory = await db
			.select({
				id: history.id,
				action: history.action,
				entityName: history.entityName,
				description: history.description,
				createdAt: history.createdAt,
				userFirstName: user.firstname,
				userLastName: user.lastname,
			})
			.from(history)
			.leftJoin(user, eq(history.userId, user.id))
			.orderBy(desc(history.createdAt))
			.limit(10)

		return NextResponse.json({
			summary: {
				devices: Number(deviceCount[0]?.total ?? 0),
				workstations: Number(workstationCount[0]?.total ?? 0),
				users: Number(userCount[0]?.total ?? 0),
				licenses: Number(licenseCount[0]?.total ?? 0),
			},
			history: recentHistory.map((entry) => ({
				id: entry.id,
				action: entry.action,
				entityName: entry.entityName,
				description: entry.description,
				createdAt: entry.createdAt,
				userName:
					entry.userFirstName || entry.userLastName
						? `${entry.userFirstName ?? ""} ${entry.userLastName ?? ""}`.trim()
						: null,
			})),
		})
	} catch (error) {
		console.error("Error loading dashboard data:", error)
		return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 })
	}
}
