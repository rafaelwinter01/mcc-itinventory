import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { makeModel, history } from "@/db/schema"

export async function GET() {
  try {
    const allMakeModels = await db.select().from(makeModel)

    return NextResponse.json(allMakeModels, { status: 200 })
  } catch (error) {
    console.error("Error fetching make models:", error)

    return NextResponse.json(
      { error: "Failed to fetch make models" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.make || typeof body.make !== "string") {
      return NextResponse.json(
        { error: "Make is required and must be a string" },
        { status: 400 }
      )
    }

    if (!body.model || typeof body.model !== "string") {
      return NextResponse.json(
        { error: "Model is required and must be a string" },
        { status: 400 }
      )
    }

    if (
      body.deviceTypeId !== undefined &&
      body.deviceTypeId !== null &&
      (!Number.isInteger(body.deviceTypeId) || body.deviceTypeId <= 0)
    ) {
      return NextResponse.json(
        { error: "deviceTypeId must be a positive integer or null" },
        { status: 400 }
      )
    }

    const newMakeModel = await db.insert(makeModel).values({
      make: body.make,
      model: body.model,
      deviceTypeId: body.deviceTypeId ?? null,
      description: body.description || null,
    })

    // Record in history
    await db.insert(history).values({
      action: "CREATE",
      entityName: "make-model",
      description: `Created new make/model: ${body.make} - ${body.model}`,
    });

    return NextResponse.json(
      {
        message: "Make/Model created successfully",
        id: newMakeModel[0].insertId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating make/model:", error)

    return NextResponse.json(
      { error: "Failed to create make/model" },
      { status: 500 }
    )
  }
}
