import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
	device,
	attribute,
	deviceComputer,
	deviceLifecycle,
	history,
	deviceType,
	status,
	location,
	department,
	makeModel,
	userDevice,
	user,
} from "@/db/schema"
import { eq, or, like, and, gte, lte, sql, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/mysql-core"

const parseExpectedReplacementYear = (value: unknown) => {
	if (value === null || value === undefined) {
		return null
	}

	const normalized = String(value).trim()
	if (!normalized) {
		return null
	}

	if (!/^\d{4}$/.test(normalized)) {
		return null
	}

	return Number(normalized)
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const statusId = searchParams.get("statusId")
		const deviceTypeId = searchParams.get("deviceTypeId")
		const locationId = searchParams.get("locationId")
		const makeModelId = searchParams.get("makeModelId")
		const q = searchParams.get("q")?.toLowerCase().trim()
		const name = searchParams.get("name")?.toLowerCase().trim()
		const warrantyEndStart = searchParams.get("warrantyEndStart")
		const warrantyEndEnd = searchParams.get("warrantyEndEnd")
		const limit = Number(searchParams.get("limit") ?? 20)
		const offset = Number(searchParams.get("offset") ?? 0)

		const filters = []

		if (name) {
			filters.push(like(sql`LOWER(${device.name})`, `%${name}%`))
		}

		if (statusId) {
			filters.push(eq(device.statusId, Number(statusId)))
		}

		if (deviceTypeId) {
			filters.push(eq(device.deviceTypeId, Number(deviceTypeId)))
		}

		if (locationId) {
			filters.push(eq(device.locationId, Number(locationId)))
		}

		if (makeModelId) {
			filters.push(eq(device.makeModelId, Number(makeModelId)))
		}

		if (q) {
			filters.push(
				or(
					like(sql`LOWER(${device.name})`, `%${q}%`),
					like(sql`LOWER(${device.serialNumber})`, `%${q}%`),
					like(sql`LOWER(${device.macAddress})`, `%${q}%`),
					like(sql`LOWER(${device.description})`, `%${q}%`)
				)
			)
		}

		if (warrantyEndStart) {
			filters.push(gte(device.warrantyEnd, new Date(warrantyEndStart)))
		}
		if (warrantyEndEnd) {
			filters.push(lte(device.warrantyEnd, new Date(warrantyEndEnd)))
		}

		const whereClause = filters.length > 0 ? and(...filters) : undefined
		const billedToLocation = alias(department, "billed_to_department")
		const costToLocation = alias(department, "cost_to_department")

		const rows = await db
			.select({
				device,
				type: deviceType,
				status,
				location,
				makeModel,
				assignedUser: user,
				computer: deviceComputer,
				lifecycle: deviceLifecycle,
				billedToLocation,
				costToLocation,
			})
			.from(device)
			.leftJoin(deviceType, eq(device.deviceTypeId, deviceType.id))
			.leftJoin(status, eq(device.statusId, status.id))
			.leftJoin(location, eq(device.locationId, location.id))
			.leftJoin(makeModel, eq(device.makeModelId, makeModel.id))
			.leftJoin(deviceComputer, eq(deviceComputer.deviceId, device.id))
			.leftJoin(deviceLifecycle, eq(deviceLifecycle.deviceId, device.id))
			.leftJoin(billedToLocation, eq(deviceLifecycle.billedTo, billedToLocation.id))
			.leftJoin(costToLocation, eq(deviceLifecycle.costTo, costToLocation.id))
			.leftJoin(
				userDevice,
				and(eq(userDevice.deviceId, device.id), eq(userDevice.assigned, true))
			)
			.leftJoin(user, eq(user.id, userDevice.userId))
			.where(whereClause)
			.limit(limit)
			.offset(offset)
			.orderBy(desc(device.createdAt))

		const [{ total }] = await db
			.select({ total: sql<number>`count(*)` })
			.from(device)
			.where(whereClause)

		const data = rows.map((row) => ({
			...row.device,
			type: row.type ?? null,
			status: row.status ?? null,
			location: row.location ?? null,
			makeModel: row.makeModel ?? null,
			computer: row.computer ?? null,
			lifecycle: row.lifecycle
				? {
					...row.lifecycle,
					billedToLocation: row.billedToLocation ?? null,
					costToLocation: row.costToLocation ?? null,
				}
				: null,
			assignedUser: row.assignedUser
				? {
					id: row.assignedUser.id,
					name: `${row.assignedUser.firstname} ${row.assignedUser.lastname}`.trim(),
					email: row.assignedUser.email,
				}
				: null,
		}))

		return NextResponse.json({
			data,
			limit,
			offset,
			total: Number(total),
			filters: {
				statusId,
				deviceTypeId,
				locationId,
				makeModelId,
				q,
				name,
				warrantyEndStart,
				warrantyEndEnd,
			},
		})
	} catch (error) {
		console.error("Error fetching devices:", error)
		return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json()
		const { attributes, computer, ...deviceData } = body
		const expectedReplacementYear = parseExpectedReplacementYear(
			deviceData.expectedReplacementYear
		)

		if (
			deviceData.expectedReplacementYear !== null &&
			deviceData.expectedReplacementYear !== undefined &&
			String(deviceData.expectedReplacementYear).trim() !== "" &&
			expectedReplacementYear === null
		) {
			return NextResponse.json(
				{ error: "expectedReplacementYear must be a 4-digit year" },
				{ status: 400 }
			)
		}

		if (!deviceData.name || !deviceData.deviceTypeId) {
			return NextResponse.json({ error: "Name and deviceTypeId are required" }, { status: 400 })
		}

		const result = await db.transaction(async (tx) => {
			const [newDevice] = await tx.insert(device).values({
				name: deviceData.name,
				deviceTypeId: Number(deviceData.deviceTypeId),
				locationId: deviceData.locationId ? Number(deviceData.locationId) : null,
				statusId: deviceData.statusId ? Number(deviceData.statusId) : null,
				makeModelId: deviceData.makeModelId ? Number(deviceData.makeModelId) : null,
				serialNumber: deviceData.serialNumber || null,
				productNumber: deviceData.productNumber || null,
				macAddress: deviceData.macAddress || null,
				warrantyStart: deviceData.warrantyStart ? new Date(deviceData.warrantyStart) : null,
				warrantyEnd: deviceData.warrantyEnd ? new Date(deviceData.warrantyEnd) : null,
				warrantyType: deviceData.warrantyType || null,
				warrantyLink: deviceData.warrantyLink || null,
				cost: deviceData.cost ? String(deviceData.cost) : null,
				supportSite: deviceData.supportSite || null,
				driversSite: deviceData.driversSite || null,
				description: deviceData.description || null,
			}).$returningId()

			const deviceId = newDevice.id

			const hasLifecycleData = Boolean(
				deviceData.purchaseDate ||
				deviceData.endOfLife ||
				expectedReplacementYear !== null ||
				deviceData.planDescription ||
				deviceData.extraNotes ||
				deviceData.billedTo ||
				deviceData.costTo
			)

			if (hasLifecycleData) {
				await tx.insert(deviceLifecycle).values({
					deviceId,
					purchaseDate: deviceData.purchaseDate ? new Date(deviceData.purchaseDate) : null,
					endOfLife: deviceData.endOfLife ? new Date(deviceData.endOfLife) : null,
					expectedReplacementYear,
					planDescription: deviceData.planDescription || null,
					extraNotes: deviceData.extraNotes || null,
					billedTo: deviceData.billedTo ? Number(deviceData.billedTo) : null,
					costTo: deviceData.costTo ? Number(deviceData.costTo) : null,
				})
			}

			if (attributes && Array.isArray(attributes)) {
				for (const attr of attributes) {
					if (attr.key && attr.value) {
						await tx.insert(attribute).values({
							deviceId,
							key: attr.key,
							value: String(attr.value),
						})
					}
				}
			}

			if (computer && computer.os) {
				await tx.insert(deviceComputer).values({
					deviceId,
					domain: computer.domain || null,
					os: computer.os,
					config: computer.config || null,
				})
			}

			if (deviceData.assignedUserId) {
				await tx.insert(userDevice).values({
					userId: Number(deviceData.assignedUserId),
					deviceId,
					assigned: true,
					dateAssignment: new Date(),
				})
			}

			await tx.insert(history).values({
				userId: null,
				action: "CREATE",
				entityName: "device",
				description: `Created device: ${deviceData.name}`,
			})

			return { id: deviceId }
		})

		return NextResponse.json(result, { status: 201 })
	} catch (error) {
		console.error("Error creating device:", error)
		return NextResponse.json({ error: "Failed to create device" }, { status: 500 })
	}
}
