import { cookies, headers } from "next/headers"

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "")

export async function resolveServerBaseUrl() {
  const requestHeaders = await headers()
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"

  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL

  if (explicitUrl) {
    return normalizeBaseUrl(explicitUrl)
  }

  if (host) {
    return `${protocol}://${host}`
  }

  return "http://localhost:3000"
}

export async function getServerCookieHeader() {
  return (await cookies())
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")
}

export async function serverApiFetch(path: string, init: RequestInit = {}) {
  const baseUrl = await resolveServerBaseUrl()
  const url = path.startsWith("http") ? path : new URL(path, baseUrl)

  const mergedHeaders = new Headers(init.headers)
  const cookieHeader = await getServerCookieHeader()

  if (cookieHeader && !mergedHeaders.has("cookie")) {
    mergedHeaders.set("cookie", cookieHeader)
  }

  return fetch(url, {
    ...init,
    headers: mergedHeaders,
  })
}
