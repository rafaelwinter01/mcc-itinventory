import { NextRequest, NextResponse } from "next/server"
import { asc, eq, sql } from "drizzle-orm"
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

type CatalogItem = {
  id: number
  name: string
  relatedCount: number
}

type CatalogResponse = {
  table: CatalogTable
  relatedLabel: string
  total: number
  items: CatalogItem[]
}

const CATALOG_TABLES: CatalogTable[] = [
  "status",
  "device-types",
  "license",
  "make-model",
  "location",
  "department",
]

const isCatalogTable = (value: string): value is CatalogTable => {
  return CATALOG_TABLES.includes(value as CatalogTable)
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession()

    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tableParam = searchParams.get("table")?.trim() ?? ""

    if (!tableParam || !isCatalogTable(tableParam)) {
      return NextResponse.json(
        {
          error: "Invalid table parameter",
          validTables: CATALOG_TABLES,
        },
        { status: 400 }
      )
    }

    let responsePayload: CatalogResponse

    if (tableParam === "status") {
      const rows = await db
        .select({
          id: status.id,
          name: status.name,
          relatedCount: sql<number>`count(${device.id})`,
        })
        .from(status)
        .leftJoin(device, eq(device.statusId, status.id))
        .groupBy(status.id, status.name)
        .orderBy(asc(status.name))

      responsePayload = {
        table: tableParam,
        relatedLabel: "Devices",
        total: rows.length,
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          relatedCount: Number(row.relatedCount ?? 0),
        })),
      }
    } else if (tableParam === "device-types") {
      const rows = await db
        .select({
          id: deviceType.id,
          name: deviceType.name,
          relatedCount: sql<number>`count(${device.id})`,
        })
        .from(deviceType)
        .leftJoin(device, eq(device.deviceTypeId, deviceType.id))
        .groupBy(deviceType.id, deviceType.name)
        .orderBy(asc(deviceType.name))

      responsePayload = {
        table: tableParam,
        relatedLabel: "Devices",
        total: rows.length,
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          relatedCount: Number(row.relatedCount ?? 0),
        })),
      }
    } else if (tableParam === "license") {
      const rows = await db
        .select({
          id: license.id,
          name: license.name,
          relatedCount: sql<number>`count(${userLicense.userId})`,
        })
        .from(license)
        .leftJoin(userLicense, eq(userLicense.licenseId, license.id))
        .groupBy(license.id, license.name)
        .orderBy(asc(license.name))

      responsePayload = {
        table: tableParam,
        relatedLabel: "User Licenses",
        total: rows.length,
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          relatedCount: Number(row.relatedCount ?? 0),
        })),
      }
    } else if (tableParam === "make-model") {
      const rows = await db
        .select({
          id: makeModel.id,
          make: makeModel.make,
          model: makeModel.model,
          relatedCount: sql<number>`count(${device.id})`,
        })
        .from(makeModel)
        .leftJoin(device, eq(device.makeModelId, makeModel.id))
        .groupBy(makeModel.id, makeModel.make, makeModel.model)
        .orderBy(asc(makeModel.make), asc(makeModel.model))

      responsePayload = {
        table: tableParam,
        relatedLabel: "Devices",
        total: rows.length,
        items: rows.map((row) => ({
          id: row.id,
          name: `${row.make} - ${row.model}`,
          relatedCount: Number(row.relatedCount ?? 0),
        })),
      }
    } else if (tableParam === "location") {
      const rows = await db
        .select({
          id: location.id,
          name: location.name,
          relatedCount: sql<number>`count(${device.id})`,
        })
        .from(location)
        .leftJoin(device, eq(device.locationId, location.id))
        .groupBy(location.id, location.name)
        .orderBy(asc(location.name))

      responsePayload = {
        table: tableParam,
        relatedLabel: "Devices",
        total: rows.length,
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          relatedCount: Number(row.relatedCount ?? 0),
        })),
      }
    } else {
      const departmentRows = await db
        .select({
          id: department.id,
          name: department.name,
        })
        .from(department)
        .orderBy(asc(department.name))

      const usersByDepartmentRows = await db
        .select({
          departmentId: user.departmentId,
          total: sql<number>`count(*)`,
        })
        .from(user)
        .where(sql`${user.departmentId} is not null`)
        .groupBy(user.departmentId)

      const devicesByDepartmentRows = await db
        .select({
          departmentId: deviceLifecycle.billedTo,
          total: sql<number>`count(*)`,
        })
        .from(deviceLifecycle)
        .where(sql`${deviceLifecycle.billedTo} is not null`)
        .groupBy(deviceLifecycle.billedTo)

      const devicesByCostDepartmentRows = await db
        .select({
          departmentId: deviceLifecycle.costTo,
          total: sql<number>`count(*)`,
        })
        .from(deviceLifecycle)
        .where(
          sql`${deviceLifecycle.costTo} is not null and (${deviceLifecycle.billedTo} is null or ${deviceLifecycle.costTo} <> ${deviceLifecycle.billedTo})`
        )
        .groupBy(deviceLifecycle.costTo)

      const usersByDepartment = usersByDepartmentRows.reduce<Record<number, number>>((acc, row) => {
        const departmentId = Number(row.departmentId)
        if (!Number.isInteger(departmentId) || departmentId < 1) {
          return acc
        }

        acc[departmentId] = Number(row.total ?? 0)
        return acc
      }, {})

      const devicesByDepartment = [...devicesByDepartmentRows, ...devicesByCostDepartmentRows].reduce<
        Record<number, number>
      >((acc, row) => {
        const departmentId = Number(row.departmentId)
        if (!Number.isInteger(departmentId) || departmentId < 1) {
          return acc
        }

        acc[departmentId] = (acc[departmentId] ?? 0) + Number(row.total ?? 0)
        return acc
      }, {})

      responsePayload = {
        table: tableParam,
        relatedLabel: "Users / Devices",
        total: departmentRows.length,
        items: departmentRows.map((row) => ({
          id: row.id,
          name: row.name?.trim() || `Department ${row.id}`,
          relatedCount: (usersByDepartment[row.id] ?? 0) + (devicesByDepartment[row.id] ?? 0),
        })),
      }
    }

    return NextResponse.json(responsePayload, { status: 200 })
  } catch (error) {
    console.error("Error fetching catalog data:", error)
    return NextResponse.json({ error: "Failed to fetch catalog data" }, { status: 500 })
  }
}