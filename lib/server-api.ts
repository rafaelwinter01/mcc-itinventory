import { cookies, headers } from "next/headers"

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "")

const normalizeInternalFetchBaseUrl = (url: string) => {
  const normalized = normalizeBaseUrl(url)

  try {
    const parsed = new URL(normalized)
    const isLocalhost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"

    if (isLocalhost && parsed.protocol === "https:") {
      parsed.protocol = "http:"
    }

    return parsed.toString().replace(/\/$/, "")
  } catch {
    return normalized
  }
}

export async function resolveServerBaseUrl() {
  const requestHeaders = await headers()
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"

  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL

  if (explicitUrl) {
    return normalizeInternalFetchBaseUrl(explicitUrl)
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
