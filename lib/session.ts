// lib/session.ts
import { db } from "@/db";
import { session, systemUser, user } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { eq, and, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "session_id";
// ✅ REDUZIDO: De 10 anos para 8 horas (segurança melhorada)
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;
// Intervalo para refresh automático de sessão (a cada 1 hora)
export const SESSION_REFRESH_INTERVAL_SECONDS = 60 * 60;

function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

export async function createSession(systemUserId: number) {
  const sessionId = uuid();
  const expiresAt = getSessionExpiryDate();

  await db.insert(session).values({
    id: sessionId,
    systemUserId,
    expiresAt,
    createdAt: new Date(),
  });

  return sessionId;
}

export async function getSession() {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

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

/**
 * ⚡ Refresh da sessão - Estende o tempo de expiração
 * Útil para manter usuários logados se estiverem ativos
 */
export async function refreshSession(sessionId: string) {
  try {
    const now = new Date();
    const newExpiryDate = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    await db
      .update(session)
      .set({ expiresAt: newExpiryDate })
      .where(
        and(
          eq(session.id, sessionId),
          gt(session.expiresAt, now) // Só refresh se ainda for válida
        )
      );

    return true;
  } catch (error) {
    console.error("Error refreshing session:", error);
    return false;
  }
}

/**
 * 🗑️ Destruir sessão - Remove a sessão do banco de dados
 * Chamado no logout
 */
export async function destroySession(sessionId: string) {
  try {
    await db.delete(session).where(eq(session.id, sessionId));
    return true;
  } catch (error) {
    console.error("Error destroying session:", error);
    return false;
  }
}

/**
 * 🔍 Validar sessão com detalhe completo
 * Retorna null se inválida ou expirada
 */
export async function validateSession(sessionId: string) {
  try {
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

    return sessionRecord || null;
  } catch (error) {
    console.error("Error validating session:", error);
    return null;
  }
}

/**
 * 🧹 Limpar sessões expiradas
 * Execute periodicamente (ex: cron job)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await db
      .delete(session)
      .where(lt(session.expiresAt, new Date()));

    console.log("Cleaned up expired sessions");
    return result;
  } catch (error) {
    console.error("Error cleaning up sessions:", error);
  }
}
