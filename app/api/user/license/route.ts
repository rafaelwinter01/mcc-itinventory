import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { history, license, userLicense } from "@/db/schema"
import { and, eq } from "drizzle-orm"

type AssignPayload = {
  userId: number
  licenseId: number
  cost?: string | number | null
  billingFrequency?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get("userId")
    const userId = Number(userIdParam)

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const rows = await db
      .select({
        licenseId: license.id,
        name: license.name,
        licenseCost: license.cost,
        licenseBilling: license.billingFrequency,
        userCost: userLicense.cost,
        userBilling: userLicense.billingFrequency,
        createdAt: userLicense.createdAt,
      })
      .from(userLicense)
      .innerJoin(license, eq(license.id, userLicense.licenseId))
      .where(eq(userLicense.userId, userId))

    return NextResponse.json(
      rows.map((row) => ({
        licenseId: row.licenseId,
        name: row.name,
        cost: row.userCost ?? null,
        billingFrequency: row.userBilling ?? null,
        createdAt: row.createdAt,
      })),
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching user licenses:", error)
    return NextResponse.json({ error: "Failed to fetch user licenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssignPayload
    const userId = Number(body.userId)
    const licenseId = Number(body.licenseId)

    if (!userId || !licenseId) {
      return NextResponse.json({ error: "userId and licenseId are required" }, { status: 400 })
    }

    const existing = await db
      .select({ userId: userLicense.userId })
      .from(userLicense)
      .where(and(eq(userLicense.userId, userId), eq(userLicense.licenseId, licenseId)))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: "License already assigned" }, { status: 409 })
    }

    const [licenseRow] = await db
      .select({ name: license.name, cost: license.cost, billingFrequency: license.billingFrequency })
      .from(license)
      .where(eq(license.id, licenseId))

    if (!licenseRow) {
      return NextResponse.json({ error: "License not found" }, { status: 404 })
    }

    const cost = licenseRow.cost ? String(licenseRow.cost) : null
    const billingFrequency = licenseRow.billingFrequency
      ? String(licenseRow.billingFrequency)
      : null

    await db.insert(userLicense).values({
      userId,
      licenseId,
      cost,
      billingFrequency,
      active: true,
    })

    await db.insert(history).values({
      userId: userId || null,
      action: "CREATE",
      entityName: "user_license",
      description: `Assigned license ${licenseRow.name} (ID: ${licenseId}) to user ${userId}`,
    })

    return NextResponse.json({ message: "License assigned" }, { status: 201 })
  } catch (error) {
    console.error("Error assigning license:", error)
    return NextResponse.json({ error: "Failed to assign license" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = Number(body.userId)
    const licenseId = Number(body.licenseId)

    if (!userId || !licenseId) {
      return NextResponse.json({ error: "userId and licenseId are required" }, { status: 400 })
    }

    const [licenseRow] = await db
      .select({ name: license.name })
      .from(license)
      .where(eq(license.id, licenseId))

    await db
      .delete(userLicense)
      .where(and(eq(userLicense.userId, userId), eq(userLicense.licenseId, licenseId)))

    await db.insert(history).values({
      userId: userId || null,
      action: "DELETE",
      entityName: "user_license",
      description: `Removed license ${licenseRow?.name ?? licenseId} (ID: ${licenseId}) from user ${userId}`,
    })

    return NextResponse.json({ message: "License removed" }, { status: 200 })
  } catch (error) {
    console.error("Error removing license:", error)
    return NextResponse.json({ error: "Failed to remove license" }, { status: 500 })
  }
}
