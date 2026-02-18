import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { peripheral, history } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET route to return all registered peripherals
 */
export async function GET() {
  try {
    const allPeripherals = await db.select().from(peripheral);

    return NextResponse.json(allPeripherals, { status: 200 });
  } catch (error) {
    console.error("Error fetching peripherals:", error);

    return NextResponse.json(
      { error: "Failed to fetch peripherals" },
      { status: 500 }
    );
  }
}

/**
 * POST route to insert a new peripheral
 * Ensures no duplicates are created based on the name
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if a peripheral with the same name already exists
    const existingPeripheral = await db
      .select()
      .from(peripheral)
      .where(eq(peripheral.name, body.name))
      .limit(1);

    if (existingPeripheral.length > 0) {
      return NextResponse.json(
        { error: "A peripheral with this name already exists" },
        { status: 409 }
      );
    }

    // Insert the new peripheral
    const [result] = await db.insert(peripheral).values({
      name: body.name,
    });

    // Record in history
    await db.insert(history).values({
      action: "CREATE",
      entityName: "peripheral",
      description: `Created new peripheral: ${body.name}`,
    });

    return NextResponse.json(
      {
        message: "Peripheral created successfully",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating peripheral:", error);

    return NextResponse.json(
      { error: "Failed to create peripheral" },
      { status: 500 }
    );
  }
}
