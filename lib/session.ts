// lib/session.ts
import { db } from "@/db";
import { session, systemUser, user } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

export async function createSession(systemUserId: number) {
  const sessionId = uuid();

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  await db.insert(session).values({
    id: sessionId,
    systemUserId,
    expiresAt,
    createdAt: new Date(),
  });

  return sessionId;
}

export async function getSession() {
  const sessionId = (await cookies()).get("session_id")?.value;

  if (!sessionId) return null;

  const [sessionRecord] = await db
    .select()
    .from(session)
    .where(
      and(
        eq(session.id, sessionId),
        gt(session.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessionRecord) return null;

  const [userData] = await db
    .select({
      id: systemUser.id,
      userId: systemUser.userId,
      username: systemUser.username,
      role: systemUser.role,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
    })
    .from(systemUser)
    .innerJoin(user, eq(systemUser.userId, user.id))
    .where(eq(systemUser.id, sessionRecord.systemUserId))
    .limit(1);

  return userData || null;
}
