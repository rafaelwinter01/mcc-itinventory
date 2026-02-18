import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { systemUser, history } from "@/db/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";

/**
 * POST route to change the current user's password
 */
export async function POST(request: NextRequest) {
  try {
    const userSession = await getSession();

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Old password and new password are required" },
        { status: 400 }
      );
    }

    // 1. Fetch current system user record from DB to get the password hash
    const [dbUser] = await db
      .select()
      .from(systemUser)
      .where(eq(systemUser.id, userSession.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, dbUser.passwordHash);
    if (!isOldPasswordValid) {
      return NextResponse.json(
        { error: "The current password you entered is incorrect" },
        { status: 400 }
      );
    }

    // 3. Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update the user record
    await db
      .update(systemUser)
      .set({
        passwordHash: hashedNewPassword,
      })
      .where(eq(systemUser.id, dbUser.id));

    // 5. Create history record
    await db.insert(history).values({
      userId: userSession.id,
      action: "UPDATE",
      entityName: "system_user",
      description: "User changed their own password",
    });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
