import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { department, history } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET route to return all departments
 */
export async function GET() {
  try {
    const allDepartments = await db.select().from(department);

    return NextResponse.json(allDepartments, { status: 200 });
  } catch (error) {
    console.error("Error fetching departments:", error);

    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

/**
 * POST route to create a new department
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

    const [result] = await db.insert(department).values({
      name: body.name,
    });

    // Record in history
    await db.insert(history).values({
      action: "CREATE",
      entityName: "department",
      description: `Created new department: ${body.name}`,
    });

    return NextResponse.json(
      {
        message: "Department created successfully",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating department:", error);

    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}

/**
 * PATCH route to update an existing department
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Department ID is required" },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    // Get current data for historical reference
    const currentData = await db
      .select()
      .from(department)
      .where(eq(department.id, body.id))
      .limit(1);

    if (currentData.length === 0) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Perform the update
    await db
      .update(department)
      .set({
        name: body.name,
        // Since schema doesn't have ON UPDATE CURRENT_TIMESTAMP, we can set it here if needed 
        // but let's follow the schema definition for now.
      })
      .where(eq(department.id, body.id));

    // Record in history
    await db.insert(history).values({
      action: "UPDATE",
      entityName: "department",
      description: `Updated department name from "${currentData[0].name}" to "${body.name}"`,
    });

    return NextResponse.json(
      { message: "Department updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating department:", error);

    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}
