import { NextResponse } from "next/server";
import { db } from "@/db";
import { location, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allLocations = await db
      .select({
        id: location.id,
        name: location.name,
        address: location.address,
        managerId: location.managerId,
        managerName: user.firstname,
        managerLastname: user.lastname,
      })
      .from(location)
      .leftJoin(user, eq(location.managerId, user.id));

    return NextResponse.json(allLocations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, managerId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [created] = await db.insert(location).values({
      name,
      address,
      managerId: managerId ? Number(managerId) : null,
    }).$returningId();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, address, managerId } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and name are required" }, { status: 400 });
    }

    await db.update(location)
      .set({
        name,
        address,
        managerId: managerId ? Number(managerId) : null,
      })
      .where(eq(location.id, id));

    return NextResponse.json({ message: "Location updated successfully" });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
