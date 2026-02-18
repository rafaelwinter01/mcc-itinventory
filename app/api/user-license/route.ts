import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { license, user, userLicense } from "@/db/schema"
import { and, eq, like, or, sql, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get("userId")
    const licenseIdParam = searchParams.get("licenseId")
    const activeParam = searchParams.get("active")
    const q = searchParams.get("q")?.toLowerCase().trim()
    const limit = Number(searchParams.get("limit") ?? 100)
    const offset = Number(searchParams.get("offset") ?? 0)

    const filters = []

    if (userIdParam) {
      filters.push(eq(userLicense.userId, Number(userIdParam)))
    }

    if (licenseIdParam) {
      filters.push(eq(userLicense.licenseId, Number(licenseIdParam)))
    }

    if (activeParam === "true" || activeParam === "false") {
      filters.push(eq(userLicense.active, activeParam === "true"))
    }

    if (q) {
      filters.push(
        or(
          like(sql`LOWER(${user.firstname})`, `%${q}%`),
          like(sql`LOWER(${user.lastname})`, `%${q}%`),
          like(sql`LOWER(${user.email})`, `%${q}%`),
          like(sql`LOWER(${license.name})`, `%${q}%`),
          like(sql`LOWER(CONCAT(${user.firstname}, ' ', ${user.lastname}))`, `%${q}%`)
        )
      )
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined

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
      .limit(limit)
      .offset(offset)
      .orderBy(desc(userLicense.createdAt))

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(userLicense)
      .innerJoin(user, eq(user.id, userLicense.userId))
      .innerJoin(license, eq(license.id, userLicense.licenseId))
      .where(whereClause)

    const data = rows.map((row) => ({
      userId: row.userId,
      licenseId: row.licenseId,
      userName: `${row.userFirstName ?? ""} ${row.userLastName ?? ""}`.trim(),
      userEmail: row.userEmail,
      licenseName: row.licenseName,
      cost: row.cost,
      billingFrequency: row.billingFrequency,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return NextResponse.json({
      data,
      limit,
      offset,
      total: Number(total),
      filters: {
        userId: userIdParam,
        licenseId: licenseIdParam,
        active: activeParam,
        q,
      },
    })
  } catch (error) {
    console.error("Error fetching user licenses:", error)
    return NextResponse.json({ error: "Failed to fetch user licenses" }, { status: 500 })
  }
}
