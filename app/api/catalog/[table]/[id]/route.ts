import { NextRequest, NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import {
  department,
  device,
  deviceLifecycle,
  deviceType,
  license,
  location,
  makeModel,
  status,
  user,
  userLicense,
} from "@/db/schema"
import { getSession } from "@/lib/session"

type CatalogTable =
  | "status"
  | "device-types"
  | "license"
  | "make-model"
  | "location"
  | "department"

type RouteContext = {
  params: Promise<{ table: string; id: string }>
}

const isCatalogTable = (value: string): value is CatalogTable => {
  return ["status", "device-types", "license", "make-model", "location", "department"].includes(
    value
  )
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await getSession()

    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { table, id } = await context.params

    if (!isCatalogTable(table)) {
      return NextResponse.json({ error: "Invalid table parameter" }, { status: 400 })
    }

    const recordId = Number(id)
    if (!Number.isInteger(recordId) || recordId < 1) {
      return NextResponse.json({ error: "Invalid id parameter" }, { status: 400 })
    }

    if (table === "status") {
      const [existing] = await db.select({ id: status.id }).from(status).where(eq(status.id, recordId)).limit(1)
      if (!existing) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 })
      }

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(device)
        .where(eq(device.statusId, recordId))

      if (Number(total) > 0) {
        return NextResponse.json(
          { error: "Delete is only allowed when related count is 0" },
          { status: 409 }
        )
      }

      await db.delete(status).where(eq(status.id, recordId))
      return NextResponse.json({ message: "Deleted successfully" }, { status: 200 })
    }

    if (table === "device-types") {
      const [existing] = await db
        .select({ id: deviceType.id })
        .from(deviceType)
        .where(eq(deviceType.id, recordId))
        .limit(1)
      if (!existing) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 })
      }

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(device)
        .where(eq(device.deviceTypeId, recordId))

      if (Number(total) > 0) {
        return NextResponse.json(
          { error: "Delete is only allowed when related count is 0" },
          { status: 409 }
        )
      }

      await db.delete(deviceType).where(eq(deviceType.id, recordId))
      return NextResponse.json({ message: "Deleted successfully" }, { status: 200 })
    }

    if (table === "license") {
      const [existing] = await db
        .select({ id: license.id })
        .from(license)
        .where(eq(license.id, recordId))
        .limit(1)
      if (!existing) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 })
      }

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(userLicense)
        .where(eq(userLicense.licenseId, recordId))

      if (Number(total) > 0) {
        return NextResponse.json(
          { error: "Delete is only allowed when related count is 0" },
          { status: 409 }
        )
      }

      await db.delete(license).where(eq(license.id, recordId))
      return NextResponse.json({ message: "Deleted successfully" }, { status: 200 })
    }

    if (table === "make-model") {
      const [existing] = await db
        .select({ id: makeModel.id })
        .from(makeModel)
        .where(eq(makeModel.id, recordId))
        .limit(1)
      if (!existing) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 })
      }

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(device)
        .where(eq(device.makeModelId, recordId))

      if (Number(total) > 0) {
        return NextResponse.json(
          { error: "Delete is only allowed when related count is 0" },
          { status: 409 }
        )
      }

      await db.delete(makeModel).where(eq(makeModel.id, recordId))
      return NextResponse.json({ message: "Deleted successfully" }, { status: 200 })
    }

    if (table === "location") {
      const [existing] = await db
        .select({ id: location.id })
        .from(location)
        .where(eq(location.id, recordId))
        .limit(1)
      if (!existing) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 })
      }

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(device)
        .where(eq(device.locationId, recordId))

      if (Number(total) > 0) {
        return NextResponse.json(
          { error: "Delete is only allowed when related count is 0" },
          { status: 409 }
        )
      }

      await db.delete(location).where(eq(location.id, recordId))
      return NextResponse.json({ message: "Deleted successfully" }, { status: 200 })
    }

    const [existing] = await db
      .select({ id: department.id })
      .from(department)
      .where(eq(department.id, recordId))
      .limit(1)
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    const [{ usersTotal }] = await db
      .select({ usersTotal: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.departmentId, recordId))

    const [{ lifecycleTotal }] = await db
      .select({ lifecycleTotal: sql<number>`count(*)` })
      .from(deviceLifecycle)
      .where(sql`${deviceLifecycle.billedTo} = ${recordId} OR ${deviceLifecycle.costTo} = ${recordId}`)

    if (Number(usersTotal) > 0 || Number(lifecycleTotal) > 0) {
      return NextResponse.json(
        { error: "Delete is only allowed when related count is 0" },
        { status: 409 }
      )
    }

    await db.delete(department).where(eq(department.id, recordId))
    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting catalog record:", error)
    return NextResponse.json({ error: "Failed to delete catalog record" }, { status: 500 })
  }
}