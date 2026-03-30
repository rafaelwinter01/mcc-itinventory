import { notFound } from "next/navigation"
import { cookies } from "next/headers"

import { DeviceDetails, type DeviceDetailsRecord } from "@/components/device-details"
import {
  DEVICE_PAGE_MODEL,
  DEVICE_PAGE_MODEL_KEYS,
} from "@/constants/preferences"
import { getSession } from "@/lib/session"

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "")

const resolveBaseUrl = () => {
  const explicitUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

  if (!explicitUrl) {
    return ""
  }

  return normalizeBaseUrl(explicitUrl)
}

const fetchDeviceDetails = async (deviceId: number): Promise<DeviceDetailsRecord> => {
  const baseUrl = resolveBaseUrl()
  const endpoint = baseUrl
    ? `${baseUrl}/api/device/${deviceId}`
    : `http://localhost:3000/api/device/${deviceId}`
  const cookieHeader = (await cookies())
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")

  const response = await fetch(endpoint, {
    cache: "no-store",
    next: { revalidate: 0 },
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })

  if (response.status === 404) {
    notFound()
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch device details (${response.status})`)
  }

  const data = (await response.json()) as DeviceDetailsRecord
  return {
    ...data,
    attributes: data.attributes ?? [],
  }
}

type PreferenceLast = {
  devicePageModel?: unknown
  value?: unknown
}

type PreferenceBucket = {
  last?: Record<string, unknown>
}

type PreferencesResponse = {
  data?: PreferenceBucket
}

const DEVICE_PAGE_VARIANTS = new Set<"default" | "compact">(Object.values(DEVICE_PAGE_MODEL_KEYS))

const resolveDevicePageVariant = (lastPreference: unknown): "default" | "compact" => {
  if (!lastPreference || typeof lastPreference !== "object" || Array.isArray(lastPreference)) {
    return DEVICE_PAGE_MODEL_KEYS.DEFAULT
  }

  const parsedLast = lastPreference as PreferenceLast
  const value =
    typeof parsedLast.devicePageModel === "string"
      ? parsedLast.devicePageModel
      : parsedLast.value

  if (typeof value === "string" && DEVICE_PAGE_VARIANTS.has(value as "default" | "compact")) {
    return value as "default" | "compact"
  }

  return DEVICE_PAGE_MODEL_KEYS.DEFAULT
}

interface DevicePageProps {
  params: Promise<{ id: string }>
}

export default async function DeviceDetailsPage({ params }: DevicePageProps) {
  const resolvedParams = await params
  const deviceId = Number(resolvedParams.id)

  if (!Number.isInteger(deviceId)) {
    notFound()
  }

  const deviceData = await fetchDeviceDetails(deviceId)

  const sessionUser = await getSession()
  const baseUrl = resolveBaseUrl() || "http://localhost:3000"
  let pageVariant: "default" | "compact" = DEVICE_PAGE_MODEL_KEYS.DEFAULT

  if (sessionUser?.username) {
    const preferenceQuery = new URLSearchParams({
      username: sessionUser.username,
      key: DEVICE_PAGE_MODEL,
    })

    const preferenceResponse = await fetch(
      `${baseUrl}/api/auth/me/preferences?${preferenceQuery.toString()}`,
      {
        cache: "no-store",
        next: { revalidate: 0 },
      }
    )

    if (preferenceResponse.ok) {
      const preferencePayload = (await preferenceResponse.json()) as PreferencesResponse
      pageVariant = resolveDevicePageVariant(preferencePayload.data?.last)
    }
  }

  return <DeviceDetails deviceData={deviceData} variant={pageVariant} />
}


