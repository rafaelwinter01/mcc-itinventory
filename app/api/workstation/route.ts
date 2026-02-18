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
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm"

type WorkstationPayload = {
	id?: number
	name?: string
	description?: string
	info?: Record<string, string>
	users?: Array<{ userId: number; assignedAt?: string }>
	devices?: Array<{ deviceId: number }>
	peripherals?: Array<{ peripheralId: number; quantity?: number }>
}

const intersectIds = (current: number[] | null, next: number[]): number[] =>
	current ? current.filter((id) => next.includes(id)) : next

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const limitParam = Number(searchParams.get("limit") ?? 20)
		const offset = Number(searchParams.get("offset") ?? 0)
		const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 20)
		const nameParam = searchParams.get("name")?.trim().toLowerCase()
		const assignedUserParam = searchParams.get("assignedUser")?.trim().toLowerCase()
		const deviceNameParam = searchParams.get("deviceName")?.trim().toLowerCase()
		const attributeKeyParam = searchParams.get("attributeKey")?.trim().toLowerCase()
		const attributeValueParam = searchParams.get("attributeValue")?.trim().toLowerCase()

		const filters = []
		let filteredIds: number[] | null = null

		if (nameParam) {
			filters.push(like(sql`LOWER(${workstation.name})`, `%${nameParam}%`))
		}

		if (attributeKeyParam || attributeValueParam) {
			const jsonPath = attributeKeyParam
				? `$."${attributeKeyParam.replace(/"/g, '\\"')}"`
				: null

			if (attributeKeyParam && attributeValueParam) {
				filters.push(
					like(
						sql`LOWER(JSON_UNQUOTE(JSON_EXTRACT(${workstation.info}, ${jsonPath})))`,
						`%${attributeValueParam}%`
					)
				)
			} else if (attributeKeyParam) {
				filters.push(sql`JSON_EXTRACT(${workstation.info}, ${jsonPath}) is not null`)
			} else if (attributeValueParam) {
				filters.push(
					like(
						sql`LOWER(CAST(${workstation.info} AS CHAR))`,
						`%${attributeValueParam}%`
					)
				)
			}
		}

		if (assignedUserParam) {
			const normalized = assignedUserParam
			const userRows = await db
				.select({ workstationId: workstationUser.workstationId })
				.from(workstationUser)
				.innerJoin(user, eq(user.id, workstationUser.userId))
				.where(
					or(
						like(sql`LOWER(${user.firstname})`, `%${normalized}%`),
						like(sql`LOWER(${user.lastname})`, `%${normalized}%`),
						like(
							sql`LOWER(CONCAT(${user.firstname}, ' ', ${user.lastname}))`,
							`%${normalized}%`
						)
					)
				)
				.groupBy(workstationUser.workstationId)

			const ids = userRows.map((row) => Number(row.workstationId))
			filteredIds = intersectIds(filteredIds, ids)
		}

		if (deviceNameParam) {
			const normalized = deviceNameParam
			const deviceRows = await db
				.select({ workstationId: workstationDevice.workstationId })
				.from(workstationDevice)
				.innerJoin(device, eq(device.id, workstationDevice.deviceId))
				.where(like(sql`LOWER(${device.name})`, `%${normalized}%`))
				.groupBy(workstationDevice.workstationId)

			const ids = deviceRows.map((row) => Number(row.workstationId))
			filteredIds = intersectIds(filteredIds, ids)
		}

		if (filteredIds && filteredIds.length === 0) {
			return NextResponse.json({ data: [], limit, offset, total: 0 })
		}

		if (filteredIds) {
			filters.push(inArray(workstation.id, filteredIds))
		}

		const whereClause = filters.length > 0 ? and(...filters) : undefined

		const rows = await db
			.select({
				id: workstation.id,
				name: workstation.name,
				description: workstation.description,
				info: workstation.info,
			})
			.from(workstation)
			.where(whereClause)
			.orderBy(desc(workstation.createdAt))
			.limit(limit)
			.offset(offset)

		const [{ total }] = await db
			.select({ total: sql<number>`count(*)` })
			.from(workstation)
			.where(whereClause)

		const ids = rows.map((item) => item.id)
		if (ids.length === 0) {
			return NextResponse.json({ data: [], limit, offset, total: Number(total) })
		}

		const userRows = await db
			.select({
				workstationId: workstationUser.workstationId,
				userId: user.id,
				firstname: user.firstname,
				lastname: user.lastname,
				departmentName: department.name,
			})
			.from(workstationUser)
			.innerJoin(user, eq(user.id, workstationUser.userId))
			.leftJoin(department, eq(user.departmentId, department.id))
			.where(inArray(workstationUser.workstationId, ids))

		const deviceRows = await db
			.select({
				workstationId: workstationDevice.workstationId,
				deviceName: device.name,
			})
			.from(workstationDevice)
			.innerJoin(device, eq(device.id, workstationDevice.deviceId))
			.where(inArray(workstationDevice.workstationId, ids))

		const usersByWorkstation = userRows.reduce<Record<number, string[]>>((acc, item) => {
			const key = item.workstationId
			const name = `${item.firstname} ${item.lastname}`.trim()
			if (!acc[key]) acc[key] = []
			acc[key].push(name)
			return acc
		}, {})

		const devicesByWorkstation = deviceRows.reduce<Record<number, string[]>>((acc, item) => {
			const key = item.workstationId
			if (!acc[key]) acc[key] = []
			acc[key].push(item.deviceName)
			return acc
		}, {})

		return NextResponse.json({
			data: rows.map((item) => ({
				id: item.id,
				name: item.name,
				description: item.description,
				attributes: item.info ?? {},
				devices: devicesByWorkstation[item.id] ?? [],
				users: usersByWorkstation[item.id] ?? [],
			})),
			limit,
			offset,
			total: Number(total),
		})
	} catch (error) {
		console.error("Error fetching workstations:", error)
		return NextResponse.json({ error: "Failed to fetch workstations" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as WorkstationPayload

		const name = body.name?.trim()
		const description = body.description?.trim()

		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 })
		}

		if (!description) {
			return NextResponse.json({ error: "Description is required" }, { status: 400 })
		}

		const result = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(workstation)
				.values({
					name,
					description,
					info: body.info ?? {},
				})
				.$returningId()

			const workstationId = created.id

			if (body.users && body.users.length > 0) {
				await tx.insert(workstationUser).values(
					body.users.map((item) => ({
						workstationId,
						userId: Number(item.userId),
						createdAt: item.assignedAt ? new Date(item.assignedAt) : undefined,
					}))
				)
			}

			if (body.devices && body.devices.length > 0) {
				await tx.insert(workstationDevice).values(
					body.devices.map((item) => ({
						workstationId,
						deviceId: Number(item.deviceId),
					}))
				)
			}

			if (body.peripherals && body.peripherals.length > 0) {
				await tx.insert(workstationPeripherical).values(
					body.peripherals.map((item) => ({
						workstationId,
						peripheralId: Number(item.peripheralId),
						quantity: item.quantity ?? 1,
					}))
				)
			}

			return { id: workstationId }
		})

		return NextResponse.json(result, { status: 201 })
	} catch (error) {
		console.error("Error creating workstation:", error)
		return NextResponse.json({ error: "Failed to create workstation" }, { status: 500 })
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = (await request.json()) as WorkstationPayload

		if (!body.id) {
			return NextResponse.json({ error: "Workstation id is required" }, { status: 400 })
		}

		const name = body.name?.trim()
		const description = body.description?.trim()

		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 })
		}

		if (!description) {
			return NextResponse.json({ error: "Description is required" }, { status: 400 })
		}

		const workstationId = Number(body.id)

		await db.transaction(async (tx) => {
			await tx
				.update(workstation)
				.set({
					name,
					description,
					info: body.info ?? {},
				})
				.where(eq(workstation.id, workstationId))

			await tx.delete(workstationUser).where(eq(workstationUser.workstationId, workstationId))
			await tx
				.delete(workstationDevice)
				.where(eq(workstationDevice.workstationId, workstationId))
			await tx
				.delete(workstationPeripherical)
				.where(eq(workstationPeripherical.workstationId, workstationId))

			if (body.users && body.users.length > 0) {
				await tx.insert(workstationUser).values(
					body.users.map((item) => ({
						workstationId,
						userId: Number(item.userId),
						createdAt: item.assignedAt ? new Date(item.assignedAt) : undefined,
					}))
				)
			}

			if (body.devices && body.devices.length > 0) {
				await tx.insert(workstationDevice).values(
					body.devices.map((item) => ({
						workstationId,
						deviceId: Number(item.deviceId),
					}))
				)
			}

			if (body.peripherals && body.peripherals.length > 0) {
				await tx.insert(workstationPeripherical).values(
					body.peripherals.map((item) => ({
						workstationId,
						peripheralId: Number(item.peripheralId),
						quantity: item.quantity ?? 1,
					}))
				)
			}
		})

		return NextResponse.json({ message: "Workstation updated successfully" }, { status: 200 })
	} catch (error) {
		console.error("Error updating workstation:", error)
		return NextResponse.json({ error: "Failed to update workstation" }, { status: 500 })
	}
}
