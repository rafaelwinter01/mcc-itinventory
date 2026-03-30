import { NextResponse } from "next/server";
import { db } from "@/db";
import { user, department, history, userDevice, device, deviceType } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {

  try {
    const body = await req.json();
    console.log("POST /api/user - Request body:", body);
    const { firstname, lastname, email, departmentId } = body;

    if (!firstname || !lastname) {

      return NextResponse.json({ error: "Firstname and lastname are required" }, { status: 400 });
    }

    if (email) {
      // Check for duplicate email
      const existing = await db.select().from(user).where(eq(user.email, email));
      if (existing.length > 0) {
        console.log("POST /api/user - Email already exists:", email);
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }
    }

    const [created] = await db
      .insert(user)
      .values({
        firstname,
        lastname,
        email: email || null,
        departmentId: departmentId ? Number(departmentId) : null,
      })
      .$returningId();

    // Create history record
    await db.insert(history).values({
      userId: null,
      action: "CREATE",
      entityName: "user",
      description: `Created user: ${firstname} ${lastname}`,
    });

    console.log("POST /api/user - User created successfully:", created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allUsersPromise = db
      .select({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        departmentId: user.departmentId,
        departmentName: department.name,
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id));

    const assignedDevicesPromise = db
      .select({
        userId: userDevice.userId,
        id: device.id,
        name: device.name,
        deviceTypeName: deviceType.name,
      })
      .from(userDevice)
      .innerJoin(device, eq(userDevice.deviceId, device.id))
      .leftJoin(deviceType, eq(device.deviceTypeId, deviceType.id))
      .where(eq(userDevice.assigned, true));

    const [allUsers, assignedDevices] = await Promise.all([
      allUsersPromise,
      assignedDevicesPromise,
    ]);

    const devicesByUser = new Map<number, Array<{ id: number; name: string; deviceTypeName: string | null }>>();

    for (const item of assignedDevices) {
      const userDevices = devicesByUser.get(item.userId) ?? [];
      userDevices.push({
        id: item.id,
        name: item.name,
        deviceTypeName: item.deviceTypeName,
      });
      devicesByUser.set(item.userId, userDevices);
    }

    const usersWithDevices = allUsers.map((item) => ({
      ...item,
      devices: devicesByUser.get(item.id) ?? [],
    }));

    return NextResponse.json(usersWithDevices, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  console.log("PUT /api/user - Starting request");
  try {
    const body = await req.json();
    console.log("PUT /api/user - Request body:", body);
    const { id, firstname, lastname, email, departmentId } = body;

    if (!id) {
      console.log("PUT /api/user - Missing user ID");
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!firstname || !lastname) {
      console.log("PUT /api/user - Missing required fields");
      return NextResponse.json({ error: "Firstname and lastname are required" }, { status: 400 });
    }

    // Check if user exists
    const [existingUser] = await db.select().from(user).where(eq(user.id, id));
    if (!existingUser) {
      console.log("PUT /api/user - User not found:", id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for duplicate email (excluding current user)
    if (email) {
      const duplicateEmail = await db.select().from(user).where(eq(user.email, email));
      if (duplicateEmail.length > 0 && duplicateEmail[0].id !== id) {
        console.log("PUT /api/user - Email already exists:", email);
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }
    }

    // Update user
    await db
      .update(user)
      .set({
        firstname,
        lastname,
        email: email || null,
        departmentId: departmentId ? Number(departmentId) : null,
      })
      .where(eq(user.id, id));

    // Create history record
    await db.insert(history).values({
      userId: null,
      action: "UPDATE",
      entityName: "user",
      description: `Updated user: ${firstname} ${lastname} (ID: ${id})`,
    });

    console.log("PUT /api/user - User updated successfully:", id);
    return NextResponse.json({ message: "User updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
