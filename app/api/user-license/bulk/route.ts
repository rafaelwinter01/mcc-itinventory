import { NextResponse } from "next/server"
import { db } from "@/db"
import { history, userLicense } from "@/db/schema"
import { and, eq, or } from "drizzle-orm"

type UserLicenseItem = {
  userId: number
  licenseId: number
}

type BulkUpdatePayload = {
  items: UserLicenseItem[]
  cost?: string | null
  billingFrequency?: string | null
  active?: boolean
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as BulkUpdatePayload
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ error: "No items selected" }, { status: 400 })
    }

    const updateFields: {
      cost?: string | null
      billingFrequency?: string | null
      active?: boolean
    } = {}

    if ("cost" in body) {
      updateFields.cost = body.cost ?? null
    }

    if ("billingFrequency" in body) {
      updateFields.billingFrequency = body.billingFrequency ?? null
    }

    if ("active" in body) {
      updateFields.active = body.active
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const whereClause = or(
      ...items.map((item) =>
        and(
          eq(userLicense.userId, Number(item.userId)),
          eq(userLicense.licenseId, Number(item.licenseId))
        )
      )
    )

    await db.update(userLicense).set(updateFields).where(whereClause)

    await db.insert(history).values({
      userId: null,
      action: "UPDATE",
      entityName: "user_license",
      description: `Bulk updated ${items.length} user license assignment(s)`,
    })

    return NextResponse.json({ updated: items.length }, { status: 200 })
  } catch (error) {
    console.error("Error updating user licenses:", error)
    return NextResponse.json({ error: "Failed to update user licenses" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { items?: UserLicenseItem[] }
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ error: "No items selected" }, { status: 400 })
    }

    const whereClause = or(
      ...items.map((item) =>
        and(
          eq(userLicense.userId, Number(item.userId)),
          eq(userLicense.licenseId, Number(item.licenseId))
        )
      )
    )

    await db.delete(userLicense).where(whereClause)

    await db.insert(history).values({
      userId: null,
      action: "DELETE",
      entityName: "user_license",
      description: `Bulk deleted ${items.length} user license assignment(s)`,
    })

    return NextResponse.json({ deleted: items.length }, { status: 200 })
  } catch (error) {
    console.error("Error deleting user licenses:", error)
    return NextResponse.json({ error: "Failed to delete user licenses" }, { status: 500 })
  }
}
