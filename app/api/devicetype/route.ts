import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deviceType, history } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET route to return all device types
 */
export async function GET() {
  try {
    const allDeviceTypes = await db.select().from(deviceType);

    return NextResponse.json(allDeviceTypes, { status: 200 });
  } catch (error) {
    console.error("Error fetching device types:", error);

    return NextResponse.json(
      { error: "Failed to fetch device types" },
      { status: 500 }
    );
  }
}

/**
 * POST route to insert a new device type
 * Ensures no duplicates are created based on the name
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if the device type already exists
    const existingType = await db
      .select()
      .from(deviceType)
      .where(eq(deviceType.name, body.name))
      .limit(1);

    if (existingType.length > 0) {
      return NextResponse.json(
        { error: "A device type with this name already exists" },
        { status: 409 }
      );
    }

    // Insert new record
    const [result] = await db.insert(deviceType).values({
      name: body.name,
    });

    // Record in history
    await db.insert(history).values({
      action: "CREATE",
      entityName: "device-type",
      description: `Created new device type: ${body.name}`,
    });

    return NextResponse.json(
      {
        message: "Device type created successfully",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating device type:", error);

    // Alternative catch for DB constraint if check above is skipped/fails
    if (error instanceof Error && error.message.includes("Duplicate")) {
      return NextResponse.json(
        { error: "A device type with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create device type" },
      { status: 500 }
    );
  }
}
