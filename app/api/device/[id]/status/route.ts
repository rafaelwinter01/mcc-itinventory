import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { device, status } from "@/db/schema"
import { eq } from "drizzle-orm"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const { id } = await context.params
		const deviceId = Number(id)

		if (!Number.isInteger(deviceId) || deviceId < 1) {
			return NextResponse.json(
				{ error: "A valid numeric device id is required" },
				{ status: 400 }
			)
		}

		let body: unknown
		try {
			body = await request.json()
		} catch {
			return NextResponse.json(
				{ error: "A JSON body with statusId is required" },
				{ status: 400 }
			)
		}

		const statusId = Number((body as { statusId?: unknown })?.statusId)
		if (!Number.isInteger(statusId) || statusId < 1) {
			return NextResponse.json(
				{ error: "A valid numeric statusId must be provided" },
				{ status: 400 }
			)
		}

		const [deviceRecord, statusRecord] = await Promise.all([
			db.select({ id: device.id }).from(device).where(eq(device.id, deviceId)).limit(1),
			db.select().from(status).where(eq(status.id, statusId)).limit(1),
		])

		if (!deviceRecord[0]) {
			return NextResponse.json({ error: "Device not found" }, { status: 404 })
		}

		if (!statusRecord[0]) {
			return NextResponse.json({ error: "Status not found" }, { status: 404 })
		}

		await db.update(device).set({ statusId }).where(eq(device.id, deviceId))

		return NextResponse.json({
			message: "Device status updated",
			deviceId,
			status: statusRecord[0],
		})
	} catch (error) {
		console.error("Error updating device status:", error)
		return NextResponse.json(
			{ error: "Failed to update device status" },
			{ status: 500 }
		)
	}
}
