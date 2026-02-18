import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { status, history } from "@/db/schema"

export async function GET() {
  try {
    const allStatus = await db.select().from(status)

    return NextResponse.json(allStatus, { status: 200 })
  } catch (error) {
    console.error("Error fetching status:", error)

    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Creating new status with data:", body)

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      )
    }

    const newStatus = await db.insert(status).values({
      name: body.name,
      color: body.color || null,
    })

    // Record in history
    await db.insert(history).values({
      action: "CREATE",
      entityName: "status",
      description: `Created new status: ${body.name}`,
    });

    return NextResponse.json(
      {
        message: "Status created successfully",
        id: newStatus[0].insertId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating status:", error)

    if (error instanceof Error && error.message.includes("Duplicate")) {
      return NextResponse.json(
        { error: "Status with this name already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create status" },
      { status: 500 }
    )
  }
}
