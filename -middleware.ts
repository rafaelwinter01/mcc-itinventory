import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const sessionId = req.cookies.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}
// // middleware.ts
// import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/db";
// import { session } from "@/db/schema";
// import { systemUser } from "@/db/schema";
// import { eq, and, gt } from "drizzle-orm";

// export async function middleware(req: NextRequest) {
//   const sessionId = req.cookies.get("session_id")?.value;
//   if (!sessionId) {
//     return NextResponse.redirect(new URL("/login", req.url));
//   }

//   const now = new Date();

//   const [result] = await db
//     .select({
//       role: systemUser.role,
//     })
//     .from(session)
//     .innerJoin(systemUser, eq(systemUser.id, session.systemUserId))
//     .where(and(eq(session.id, sessionId), gt(session.expiresAt, now)));

//   if (!result) {
//     return NextResponse.redirect(new URL("/login", req.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/((?!login|api/auth).*)"],
// };
