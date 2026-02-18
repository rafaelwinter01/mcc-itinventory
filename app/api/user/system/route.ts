import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user as userTable, systemUser, history } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * GET route to fetch system user by userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log("Fetching system user", searchParams.toString());
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const [systemUserRecord] = await db
      .select()
      .from(systemUser)
      .where(eq(systemUser.userId, Number(userId)))
      .limit(1);

    if (!systemUserRecord) {
      return NextResponse.json(
        { error: "System user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(systemUserRecord, { status: 200 });
  } catch (error) {
    console.error("Error fetching system user:", error);
    return NextResponse.json(
      { error: "Failed to fetch system user" },
      { status: 500 }
    );
  }
}

/**
 * Generates a random alphanumeric password
 */

function generatePassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * PUT route to update system user by email
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, role } = body;

    // Basic validation
    if (!email || !username || !role) {
      return NextResponse.json(
        { error: "Email, username, and role are required" },
        { status: 400 }
      );
    }

    // 1. Validate if the email exists in the 'user' table
    const [existingPerson] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (!existingPerson) {
      return NextResponse.json(
        { error: "Email not found in the personnel database" },
        { status: 404 }
      );
    }

    // 2. Check if the system user exists
    const [existingSystemUser] = await db
      .select()
      .from(systemUser)
      .where(eq(systemUser.userId, existingPerson.id))
      .limit(1);

    if (!existingSystemUser) {
      return NextResponse.json(
        { error: "System user not found for this email" },
        { status: 404 }
      );
    }

    // 3. Generate a new random password and hash it
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Update the system user
    await db.update(systemUser)
      .set({
        username,
        passwordHash,
        role: role as "admin" | "common",
      })
      .where(eq(systemUser.userId, existingPerson.id));

    // 5. Record in history
    await db.insert(history).values({
      action: "UPDATE",
      entityName: "system_user",
      description: `Updated system user account for ${email} with username ${username}`,
    });

    // 6. Return the data to the API as requested
    return NextResponse.json(
      {
        email,
        username,
        role,
        password,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating system user:", error);
    return NextResponse.json(
      { error: "Failed to update system user" },
      { status: 500 }
    );
  }
}

/**
 * POST route to generate a new system user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, role } = body;

    // Basic validation
    if (!email || !username || !role) {
      return NextResponse.json(
        { error: "Email, username, and role are required" },
        { status: 400 }
      );
    }

    // 1. Validate if the email exists in the 'user' table
    const [existingPerson] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (!existingPerson) {
      return NextResponse.json(
        { error: "Email not found in the personnel database" },
        { status: 404 }
      );
    }

    // 2. Check if the username already exists or if the user already has a system account
    const existingSystemUser = await db
      .select()
      .from(systemUser)
      .where(
        or(
          eq(systemUser.username, username),
          eq(systemUser.userId, existingPerson.id)
        )
      )
      .limit(1);

    if (existingSystemUser.length > 0) {
      const isDuplicateUsername = existingSystemUser[0].username === username;
      return NextResponse.json(
        { 
          error: isDuplicateUsername 
            ? "Username already exists" 
            : "A system account already exists for this email" 
        },
        { status: 409 }
      );
    }

    // 3. Generate a random password and hash it
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert the new system user
    await db.insert(systemUser).values({
      userId: existingPerson.id,
      username,
      passwordHash,
      role: role as "admin" | "common",
      isActive: 1,
    });

    // 5. Record in history
    await db.insert(history).values({
      action: "CREATE",
      entityName: "system_user",
      description: `Generated system user account for ${email} with username ${username}`,
    });

    // 6. Return the data to the API as requested
    return NextResponse.json(
      {
        email,
        username,
        role,
        password,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating system user:", error);
    return NextResponse.json(
      { error: "Failed to generate system user" },
      { status: 500 }
    );
  }
}
