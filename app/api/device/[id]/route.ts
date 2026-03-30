import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { saveHistory } from "@/db/historyServices"
import { getSession } from "@/lib/session"
import {
  device,
  deviceType,
  status,
  location,
  department,
  makeModel,
  attribute,
  deviceComputer,
  deviceLifecycle,
  userDevice,
  user,
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
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

type RouteContext = {
  params: Promise<{ id: string }>
}

const toDateKey = (value: Date | string | null | undefined) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const normalizeText = (value: string | null | undefined) => {
  if (value === null || value === undefined) return null
  const normalized = value.trim()
  return normalized === "" ? null : normalized
}

const isLifecycleEqual = (
  previous:
    | {
        purchaseDate: Date | null
        endOfLife: Date | null
        expectedReplacementYear: number | null
        planDescription: string | null
        extraNotes: string | null
        billedTo: number | null
        costTo: number | null
      }
    | null,
  next: {
    purchaseDate: Date | null
    endOfLife: Date | null
    expectedReplacementYear: number | null
    planDescription: string | null
    extraNotes: string | null
    billedTo: number | null
    costTo: number | null
  }
) => {
  if (!previous) return false

  return (
    toDateKey(previous.purchaseDate) === toDateKey(next.purchaseDate) &&
    toDateKey(previous.endOfLife) === toDateKey(next.endOfLife) &&
    previous.expectedReplacementYear === next.expectedReplacementYear &&
    normalizeText(previous.planDescription) === normalizeText(next.planDescription) &&
    normalizeText(previous.extraNotes) === normalizeText(next.extraNotes) &&
    previous.billedTo === next.billedTo &&
    previous.costTo === next.costTo
  )
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await getSession()

    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const deviceId = Number(id)

    console.log("Fetching details for device ID:", deviceId)

    if (!Number.isInteger(deviceId) || deviceId < 1) {
      return NextResponse.json(
        { error: "A valid numeric device id is required" },
        { status: 400 }
      )
    }

    const billedToLocation = alias(department, "billed_to_department")
    const costToLocation = alias(department, "cost_to_department")

    const [record] = await db
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
      .leftJoin(user, eq(userDevice.userId, user.id))
      .where(eq(device.id, deviceId))
      .limit(1)

    if (!record) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Fetch custom attributes and the optional computer spec in parallel.
    const [attributes] = await Promise.all([
      db.select().from(attribute).where(eq(attribute.deviceId, deviceId)),
    ])

    return NextResponse.json({
      ...record.device,
      type: record.type ?? null,
      status: record.status ?? null,
      location: record.location ?? null,
      makeModel: record.makeModel ?? null,
      assignedUser: record.assignedUser
        ? {
            id: record.assignedUser.id,
            name: `${record.assignedUser.firstname} ${record.assignedUser.lastname}`.trim(),
            email: record.assignedUser.email,
          }
        : null,
      attributes,
      computer: record.computer ?? null,
      lifecycle: record.lifecycle
        ? {
            ...record.lifecycle,
            billedToLocation: record.billedToLocation ?? null,
            costToLocation: record.costToLocation ?? null,
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching device details:", error)
    return NextResponse.json({ error: "Failed to fetch device" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await getSession()

    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const deviceId = Number(id)

    if (!Number.isInteger(deviceId) || deviceId < 1) {
      return NextResponse.json(
        { error: "A valid numeric device id is required" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { attributes = [], computer, ...deviceData } = body
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
      return NextResponse.json(
        { error: "Name and deviceTypeId are required" },
        { status: 400 }
      )
    }

    let hasUserAssignmentChange = false
    let hasLifecycleChange = false
    let previousAssignedUserId: number | null = null
    let nextAssignedUserId: number | null = null

    await db.transaction(async (tx) => {
      await tx
        .update(device)
        .set({
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
        })
        .where(eq(device.id, deviceId))

      // Handle User Assignment
      const newUserId =
        deviceData.assignedUserId && deviceData.assignedUserId !== ""
          ? Number(deviceData.assignedUserId)
          : null

      nextAssignedUserId = newUserId

      const [currentAssignment] = await tx
        .select()
        .from(userDevice)
        .where(and(eq(userDevice.deviceId, deviceId), eq(userDevice.assigned, true)))
        .limit(1)

      previousAssignedUserId = currentAssignment?.userId ?? null
      hasUserAssignmentChange = previousAssignedUserId !== nextAssignedUserId

      if (currentAssignment && currentAssignment.userId !== newUserId) {
        await tx
          .update(userDevice)
          .set({ assigned: false })
          .where(eq(userDevice.id, currentAssignment.id))
      }

      if (newUserId && (!currentAssignment || currentAssignment.userId !== newUserId)) {
        await tx.insert(userDevice).values({
          userId: newUserId,
          deviceId,
          assigned: true,
          dateAssignment: new Date(),
        })
      }

      await tx.delete(attribute).where(eq(attribute.deviceId, deviceId))

      if (Array.isArray(attributes)) {
        for (const attr of attributes) {
          if (attr?.key && attr?.value) {
            await tx.insert(attribute).values({
              deviceId,
              key: attr.key,
              value: String(attr.value),
            })
          }
        }
      }

      await tx.delete(deviceComputer).where(eq(deviceComputer.deviceId, deviceId))

      if (computer && computer.os) {
        await tx.insert(deviceComputer).values({
          deviceId,
          domain: computer.domain || null,
          os: computer.os,
          config: computer.config || null,
        })
      }

      const lifecyclePayload = {
        purchaseDate: deviceData.purchaseDate ? new Date(deviceData.purchaseDate) : null,
        endOfLife: deviceData.endOfLife ? new Date(deviceData.endOfLife) : null,
        expectedReplacementYear,
        planDescription: deviceData.planDescription || null,
        extraNotes: deviceData.extraNotes || null,
        billedTo: deviceData.billedTo ? Number(deviceData.billedTo) : null,
        costTo: deviceData.costTo ? Number(deviceData.costTo) : null,
      }

      const [currentLifecycle] = await tx
        .select({
          purchaseDate: deviceLifecycle.purchaseDate,
          endOfLife: deviceLifecycle.endOfLife,
          expectedReplacementYear: deviceLifecycle.expectedReplacementYear,
          planDescription: deviceLifecycle.planDescription,
          extraNotes: deviceLifecycle.extraNotes,
          billedTo: deviceLifecycle.billedTo,
          costTo: deviceLifecycle.costTo,
        })
        .from(deviceLifecycle)
        .where(eq(deviceLifecycle.deviceId, deviceId))
        .limit(1)

      const hasLifecycleData =
        lifecyclePayload.purchaseDate !== null ||
        lifecyclePayload.endOfLife !== null ||
        lifecyclePayload.expectedReplacementYear !== null ||
        lifecyclePayload.planDescription !== null ||
        lifecyclePayload.extraNotes !== null ||
        lifecyclePayload.billedTo !== null ||
        lifecyclePayload.costTo !== null

      hasLifecycleChange = hasLifecycleData
        ? !isLifecycleEqual(currentLifecycle ?? null, lifecyclePayload)
        : Boolean(currentLifecycle)

      await tx.delete(deviceLifecycle).where(eq(deviceLifecycle.deviceId, deviceId))

      if (hasLifecycleData) {
        await tx.insert(deviceLifecycle).values({
          deviceId,
          ...lifecyclePayload,
        })
      }

    })

    await saveHistory({
      userId: sessionUser.userId,
      action: "UPDATE",
      entityName: "device",
      description: `Updated device: ${deviceData.name}`,
      entityId: deviceId,
    })

    if (hasUserAssignmentChange) {
      await saveHistory({
        userId: sessionUser.userId,
        action: "ASSIGN",
        entityName: "device",
        description: `Changed assigned user from ${previousAssignedUserId ?? "none"} to ${nextAssignedUserId ?? "none"}`,
        entityId: deviceId,
      })
    }

    if (hasLifecycleChange) {
      await saveHistory({
        userId: sessionUser.userId,
        action: "UPDATE",
        entityName: "device",
        description: "Updated lifecycle data",
        entityId: deviceId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating device:", error)
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 })
  }
}