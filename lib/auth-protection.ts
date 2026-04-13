/**
 * 🔐 Utilitários de Proteção de Autenticação
 * ============================================================================
 * Funções auxiliares para validar autenticação em páginas e APIs
 */

import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/session";

// ============================================================================
// 🛡️ PROTEÇÃO PARA APIs
// ============================================================================

/**
 * Valida se usuário está autenticado (para APIs)
 * Uso: if (!await requireAuth()) return;
 */
export async function requireAuth() {
  const sessionUser = await getSession();

  if (!sessionUser) {
    return null;
  }

  return sessionUser;
}

/**
 * Retorna erro 401 se não autenticado
 * Uso em API routes
 */
export async function ensureAuth() {
  const sessionUser = await getSession();

  if (!sessionUser) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
      user: null,
    };
  }

  return { error: null, user: sessionUser };
}

/**
 * Valida se usuário é ADMIN
 * Retorna null se autorizado, ou NextResponse com erro
 */
export async function requireAdmin() {
  const sessionUser = await getSession();

  if (!sessionUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (sessionUser.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }

  return null; // Autorizado
}

/**
 * Wrapper para APIs protegidas
 * Retorna erro automático se não autenticado
 *
 * Uso:
 * export async function GET(req: NextRequest) {
 *   const authError = await protectRoute();
 *   if (authError) return authError;
 *   // ... resto do código
 * }
 */
export async function protectRoute() {
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null; // Autorizado
}

/**
 * Wrapper para APIs de admin apenas
 */
export async function protectAdminRoute() {
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }

  return null; // Autorizado
}

// ============================================================================
// 📄 PROTEÇÃO PARA PÁGINAS (Server Components)
// ============================================================================

/**
 * HOC para proteger páginas do lado do servidor
 *
 * Uso:
 * import { withPageAuth } from '@/lib/auth-protection';
 *
 * export default withPageAuth(function MyPage() {
 *   return <div>Conteúdo protegido</div>
 * })
 */
export function withPageAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return async function ProtectedPage(props: P) {
    const session = await getSession();

    if (!session) {
      // Redireciona para login (fazer no layout/middleware)
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC para proteger páginas com validação de role
 *
 * Uso:
 * export default withPageAuthRole(UserManagementPage, 'admin')
 */
export function withPageAuthRole<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: string
) {
  return async function ProtectedPage(props: P) {
    const session = await getSession();

    if (!session) {
      return null;
    }

    if (session.role !== requiredRole) {
      // Renderizar página de acesso negado
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h1>Acesso Negado</h1>
          <p>Você não tem permissão para acessar esta página</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// ============================================================================
// 📋 UTILIDADES
// ============================================================================

/**
 * Extrai informações de autenticação da requisição
 */
export async function getAuthContext() {
  const user = await getSession();

  return {
    isAuthenticated: !!user,
    user,
    isAdmin: user?.role === "admin",
  };
}

/**
 * Valida requisição JSON de API
 * Combina autenticação + validação de body
 */
export async function validateProtectedRequest(
  req: NextRequest,
  validateBody?: (body: any) => boolean
) {
  // 1. Valida autenticação
  const authError = await protectRoute();
  if (authError) return { error: authError, body: null };

  // 2. Valida body se fornecido
  if (validateBody) {
    try {
      const body = await req.json();
      if (!validateBody(body)) {
        return {
          error: NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
          ),
          body: null,
        };
      }
      return { error: null, body };
    } catch {
      return {
        error: NextResponse.json(
          { error: "Invalid JSON" },
          { status: 400 }
        ),
        body: null,
      };
    }
  }

  return { error: null, body: null };
}
