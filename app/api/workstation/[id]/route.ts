import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
	workstation,
	workstationUser,
	workstationDevice,
	workstationPeripherical,
	user,
	department,
	device,
	deviceType,
	makeModel,
	peripheral,
} from "@/db/schema"
import { eq } from "drizzle-orm"

type RouteParams = {
	params: Promise<{
		id: string
	}>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id: idParam } = await params
		const id = Number(idParam)
		if (!id) {
			return NextResponse.json({ error: "Invalid workstation id" }, { status: 400 })
		}

		const [workstationRow] = await db.select().from(workstation).where(eq(workstation.id, id))
		if (!workstationRow) {
			return NextResponse.json({ error: "Workstation not found" }, { status: 404 })
		}

		const userRows = await db
			.select({
				userId: user.id,
				firstname: user.firstname,
				lastname: user.lastname,
				departmentName: department.name,
				assignedAt: workstationUser.createdAt,
			})
			.from(workstationUser)
			.innerJoin(user, eq(user.id, workstationUser.userId))
			.leftJoin(department, eq(user.departmentId, department.id))
			.where(eq(workstationUser.workstationId, id))

		const deviceRows = await db
			.select({
				deviceId: device.id,
				name: device.name,
				typeName: deviceType.name,
				make: makeModel.make,
				model: makeModel.model,
			})
			.from(workstationDevice)
			.innerJoin(device, eq(device.id, workstationDevice.deviceId))
			.leftJoin(deviceType, eq(device.deviceTypeId, deviceType.id))
			.leftJoin(makeModel, eq(device.makeModelId, makeModel.id))
			.where(eq(workstationDevice.workstationId, id))

		const peripheralRows = await db
			.select({
				peripheralId: peripheral.id,
				name: peripheral.name,
				quantity: workstationPeripherical.quantity,
			})
			.from(workstationPeripherical)
			.innerJoin(peripheral, eq(peripheral.id, workstationPeripherical.peripheralId))
			.where(eq(workstationPeripherical.workstationId, id))

		return NextResponse.json({
			id: workstationRow.id,
			name: workstationRow.name,
			description: workstationRow.description,
			info: workstationRow.info ?? {},
			users: userRows.map((item) => ({
				userId: item.userId,
				name: `${item.firstname} ${item.lastname}`.trim(),
				department: item.departmentName ?? null,
				assignedAt: item.assignedAt
					? new Date(item.assignedAt).toISOString()
					: new Date().toISOString(),
			})),
			devices: deviceRows.map((item) => ({
				deviceId: item.deviceId,
				name: item.name,
				type: item.typeName ?? null,
				makeModel: [item.make, item.model].filter(Boolean).join(" ") || null,
			})),
			peripherals: peripheralRows.map((item) => ({
				peripheralId: item.peripheralId,
				name: item.name,
				quantity: item.quantity ?? 1,
			})),
		})
	} catch (error) {
		console.error("Error fetching workstation:", error)
		return NextResponse.json({ error: "Failed to fetch workstation" }, { status: 500 })
	}
}
