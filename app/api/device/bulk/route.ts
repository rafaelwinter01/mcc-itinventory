import { NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { attribute, device, deviceComputer, deviceLifecycle, userDevice } from "@/db/schema"

type BulkUpdatePayload = {
	ids: number[]
	updates: Record<string, unknown>
}

type BulkDeletePayload = {
	ids: number[]
}

export async function PUT(request: Request) {
	try {
		const body = (await request.json()) as BulkUpdatePayload

        console.log("Bulk update payload:", body)

		if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
			return NextResponse.json({ error: "ids is required" }, { status: 400 })
		}

		if (!body?.updates || typeof body.updates !== "object") {
			return NextResponse.json({ error: "updates is required" }, { status: 400 })
		}

		const ids = body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id))

		if (ids.length === 0) {
			return NextResponse.json({ error: "ids must be numeric" }, { status: 400 })
		}

		const updates = body.updates

		const parseExpectedReplacementYear = (value: unknown) => {
			if (value === null || value === undefined || value === "") {
				return null
			}

			const normalized = String(value).trim()
			if (!/^\d{4}$/.test(normalized)) {
				return undefined
			}

			return Number(normalized)
		}

		const updateSet: Record<string, unknown> = {}

		const hasKey = (key: string) =>
			Object.prototype.hasOwnProperty.call(updates, key)

		const setIfPresent = (key: string, value: unknown) => {
			if (hasKey(key)) {
				updateSet[key] = value
			}
		}

		setIfPresent("name", updates.name)
		setIfPresent(
			"deviceTypeId",
			updates.deviceTypeId ? Number(updates.deviceTypeId) : null
		)
		setIfPresent(
			"locationId",
			updates.locationId ? Number(updates.locationId) : null
		)
		setIfPresent(
			"statusId",
			updates.statusId ? Number(updates.statusId) : null
		)
		setIfPresent(
			"makeModelId",
			updates.makeModelId ? Number(updates.makeModelId) : null
		)
		setIfPresent("serialNumber", updates.serialNumber ?? null)
		setIfPresent("productNumber", updates.productNumber ?? null)
		setIfPresent("macAddress", updates.macAddress ?? null)
		setIfPresent(
			"warrantyStart",
			updates.warrantyStart ? new Date(String(updates.warrantyStart)) : null
		)
		setIfPresent(
			"warrantyEnd",
			updates.warrantyEnd ? new Date(String(updates.warrantyEnd)) : null
		)
		setIfPresent("warrantyType", updates.warrantyType ?? null)
		setIfPresent("cost", updates.cost ? String(updates.cost) : null)
		setIfPresent("supportSite", updates.supportSite ?? null)
		setIfPresent("driversSite", updates.driversSite ?? null)
		setIfPresent("description", updates.description ?? null)

		const lifecycleSet: Record<string, unknown> = {}
		const hasLifecycleKey = (key: string) =>
			Object.prototype.hasOwnProperty.call(updates, key)

		if (hasLifecycleKey("purchaseDate")) {
			lifecycleSet.purchaseDate = updates.purchaseDate
				? new Date(String(updates.purchaseDate))
				: null
		}

		if (hasLifecycleKey("endOfLife")) {
			lifecycleSet.endOfLife = updates.endOfLife
				? new Date(String(updates.endOfLife))
				: null
		}

		if (hasLifecycleKey("expectedReplacementYear")) {
			const parsedYear = parseExpectedReplacementYear(updates.expectedReplacementYear)
			if (parsedYear === undefined) {
				return NextResponse.json(
					{ error: "expectedReplacementYear must be a 4-digit year" },
					{ status: 400 }
				)
			}

			lifecycleSet.expectedReplacementYear = parsedYear
		}

		if (hasLifecycleKey("planDescription")) {
			lifecycleSet.planDescription = updates.planDescription ?? null
		}

		if (hasLifecycleKey("billedTo")) {
			lifecycleSet.billedTo = updates.billedTo ? Number(updates.billedTo) : null
		}

		if (hasLifecycleKey("costTo")) {
			lifecycleSet.costTo = updates.costTo ? Number(updates.costTo) : null
		}

		const hasLifecycleUpdates = Object.keys(lifecycleSet).length > 0

		const assignedUserId = hasKey("assignedUserId")
			? updates.assignedUserId
				? Number(updates.assignedUserId)
				: updates.assignedUserId === null || updates.assignedUserId === ""
					? null
					: null
			: undefined

		await db.transaction(async (tx) => {
			if (Object.keys(updateSet).length > 0) {
				await tx.update(device).set(updateSet).where(inArray(device.id, ids))
			}

			if (hasLifecycleUpdates) {
				for (const deviceId of ids) {
					const [existingLifecycle] = await tx
						.select()
						.from(deviceLifecycle)
						.where(eq(deviceLifecycle.deviceId, deviceId))
						.limit(1)

					if (existingLifecycle) {
						await tx
							.update(deviceLifecycle)
							.set(lifecycleSet)
							.where(eq(deviceLifecycle.deviceId, deviceId))
					} else {
						const hasAnyValue = Object.values(lifecycleSet).some(
							(value) => value !== null && value !== undefined
						)

						if (hasAnyValue) {
							await tx.insert(deviceLifecycle).values({
								deviceId,
								...lifecycleSet,
							})
						}
					}
				}
			}

			if (assignedUserId !== undefined) {
				for (const deviceId of ids) {
					const [currentAssignment] = await tx
						.select()
						.from(userDevice)
						.where(and(eq(userDevice.deviceId, deviceId), eq(userDevice.assigned, true)))
						.limit(1)

					if (currentAssignment) {
						await tx
							.update(userDevice)
							.set({ assigned: false })
							.where(eq(userDevice.id, currentAssignment.id))
					}

					if (assignedUserId) {
						await tx.insert(userDevice).values({
							userId: assignedUserId,
							deviceId,
							assigned: true,
							dateAssignment: new Date(),
						})
					}
				}
			}
		})

		return NextResponse.json({ success: true, updatedIds: ids })
	} catch (error) {
		console.error("Error bulk updating devices:", error)
		return NextResponse.json(
			{ error: "Failed to bulk update devices" },
			{ status: 500 }
		)
	}
}

export async function DELETE(request: Request) {
	try {
		const body = (await request.json()) as BulkDeletePayload

		if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
			return NextResponse.json({ error: "ids is required" }, { status: 400 })
		}

		const ids = body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id))

		if (ids.length === 0) {
			return NextResponse.json({ error: "ids must be numeric" }, { status: 400 })
		}

		await db.transaction(async (tx) => {
			await tx.delete(attribute).where(inArray(attribute.deviceId, ids))
			await tx.delete(deviceComputer).where(inArray(deviceComputer.deviceId, ids))
			await tx.delete(userDevice).where(inArray(userDevice.deviceId, ids))
			await tx.delete(device).where(inArray(device.id, ids))
		})

		return NextResponse.json({ success: true, deletedIds: ids })
	} catch (error) {
		console.error("Error bulk deleting devices:", error)
		return NextResponse.json(
			{ error: "Failed to bulk delete devices" },
			{ status: 500 }
		)
	}
}

