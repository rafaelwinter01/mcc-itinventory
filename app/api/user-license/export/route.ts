import { NextResponse } from "next/server"
import { db } from "@/db"
import { license, user, userLicense } from "@/db/schema"
import { and, eq, like, or, sql, desc } from "drizzle-orm"

type UserLicenseItem = {
  userId: number
  licenseId: number
}

type ExportPayload = {
  selectedItems: UserLicenseItem[]
  listedItems: UserLicenseItem[]
  selectedFields: string[]
  allFields: string[]
  includesOnlySelected: boolean
  includesRowsNotListed: boolean
  filters?: {
    userId?: string
    licenseId?: string
    active?: string
    q?: string
  }
}

const fieldLabelMap: Record<string, string> = {
  userName: "User",
  userEmail: "Email",
  licenseName: "License",
  cost: "Cost",
  billingFrequency: "Billing",
  active: "Active",
  createdAt: "Assigned At",
  updatedAt: "Updated At",
}

const escapeCsv = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportPayload
    const selectedItems = Array.isArray(body.selectedItems) ? body.selectedItems : []
    const listedItems = Array.isArray(body.listedItems) ? body.listedItems : []
    const selectedFields = Array.isArray(body.selectedFields) && body.selectedFields.length > 0
      ? body.selectedFields
      : Array.isArray(body.allFields)
        ? body.allFields
        : Object.keys(fieldLabelMap)

    const filters = body.filters ?? {}

    let whereClause

    if (body.includesOnlySelected) {
      if (selectedItems.length === 0) {
        return NextResponse.json({ error: "No selected items" }, { status: 400 })
      }
      whereClause = or(
        ...selectedItems.map((item) =>
          and(
            eq(userLicense.userId, Number(item.userId)),
            eq(userLicense.licenseId, Number(item.licenseId))
          )
        )
      )
    } else if (!body.includesRowsNotListed) {
      if (listedItems.length === 0) {
        return NextResponse.json({ error: "No listed items" }, { status: 400 })
      }
      whereClause = or(
        ...listedItems.map((item) =>
          and(
            eq(userLicense.userId, Number(item.userId)),
            eq(userLicense.licenseId, Number(item.licenseId))
          )
        )
      )
    } else {
      const filterClauses = []

      if (filters.userId) {
        filterClauses.push(eq(userLicense.userId, Number(filters.userId)))
      }

      if (filters.licenseId) {
        filterClauses.push(eq(userLicense.licenseId, Number(filters.licenseId)))
      }

      if (filters.active === "true" || filters.active === "false") {
        filterClauses.push(eq(userLicense.active, filters.active === "true"))
      }

      if (filters.q) {
        const query = filters.q.toLowerCase().trim()
        if (query) {
          filterClauses.push(
            or(
              like(sql`LOWER(${user.firstname})`, `%${query}%`),
              like(sql`LOWER(${user.lastname})`, `%${query}%`),
              like(sql`LOWER(${user.email})`, `%${query}%`),
              like(sql`LOWER(${license.name})`, `%${query}%`),
              like(sql`LOWER(CONCAT(${user.firstname}, ' ', ${user.lastname}))`, `%${query}%`)
            )
          )
        }
      }

      whereClause = filterClauses.length > 0 ? and(...filterClauses) : undefined
    }

    const rows = await db
      .select({
        userId: userLicense.userId,
        licenseId: userLicense.licenseId,
        cost: userLicense.cost,
        billingFrequency: userLicense.billingFrequency,
        active: userLicense.active,
        createdAt: userLicense.createdAt,
        updatedAt: userLicense.updatedAt,
        userFirstName: user.firstname,
        userLastName: user.lastname,
        userEmail: user.email,
        licenseName: license.name,
      })
      .from(userLicense)
      .innerJoin(user, eq(user.id, userLicense.userId))
      .innerJoin(license, eq(license.id, userLicense.licenseId))
      .where(whereClause)
      .orderBy(desc(userLicense.createdAt))

    const headerRow = selectedFields.map((key) => fieldLabelMap[key] ?? key)
    const csvLines = [headerRow.map(escapeCsv).join(",")]

    rows.forEach((row) => {
      const record = {
        userName: `${row.userFirstName ?? ""} ${row.userLastName ?? ""}`.trim(),
        userEmail: row.userEmail ?? "",
        licenseName: row.licenseName ?? "",
        cost: row.cost ?? "",
        billingFrequency: row.billingFrequency ?? "",
        active: row.active === null || row.active === undefined ? "" : row.active ? "Yes" : "No",
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : "",
      }

      const line = selectedFields.map((key) => escapeCsv((record as Record<string, unknown>)[key]))
      csvLines.push(line.join(","))
    })

    const csvContent = csvLines.join("\n")

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=\"user-licenses-export.csv\"",
      },
    })
  } catch (error) {
    console.error("Error exporting user licenses:", error)
    return NextResponse.json({ error: "Failed to export user licenses" }, { status: 500 })
  }
}
