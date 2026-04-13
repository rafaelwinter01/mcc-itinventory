import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// MIDDLEWARE - Porteiro global de autenticação
// ============================================================================
// Este middleware intercepta TODAS as requisições e valida autenticação
// antes delas chegarem às páginas/APIs
//
// ⚠️ IMPORTANTE: Middleware roda no EDGE RUNTIME (não Node.js normal)
//    - Não pode acessar BD
//    - Não pode usar módulos Node.js (stream, fs, path, etc)
//    - Apenas verifica presença de cookie

// Cookie name (deve ser igual ao definido em lib/session.ts)
const SESSION_COOKIE_NAME = "session_id";

// Rotas que NÃO requerem autenticação
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/login/verify",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/password/forgot",
  "/api/auth/password/reset",
];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ✅ Verifica se é rota pública
  const isPublic = PUBLIC_ROUTES.some((route) => {
    return pathname.startsWith(route);
  });

  if (isPublic) {
    return NextResponse.next();
  }

  // ============================================================================
  // 🔐 Valida presença de cookie de sessão
  // ============================================================================

  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession) {
    // Para APIs: retorna 401
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Para páginas: redireciona para login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ✅ Sessão existe - deixa passar
  // Validação completa (expiração, etc) ocorre no servidor via getSession()
  return NextResponse.next();
}

// ============================================================================
// CONFIG - Define quais rotas o middleware intercepta
// ============================================================================
export const config = {
  matcher: [
    // ✅ Aplica middleware a tudo EXCETO:
    // _next, public, assets estáticos, e rotas de autenticação
    "/((?!_next|public|.*\\..*|api/auth).*)",
  ],
};
