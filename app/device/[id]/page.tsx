import { notFound, redirect } from "next/navigation"

import { DeviceDetails, type DeviceDetailsRecord } from "@/components/device-details"
import {
  DEVICE_PAGE_MODEL,
  DEVICE_PAGE_MODEL_KEYS,
} from "@/constants/preferences"
import { getSession } from "@/lib/session"
import { serverApiFetch } from "@/lib/server-api"

const fetchDeviceDetails = async (deviceId: number): Promise<DeviceDetailsRecord> => {
  const response = await serverApiFetch(`/api/device/${deviceId}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  })

  if (response.status === 401) {
    redirect("/login")
  }

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
  let pageVariant: "default" | "compact" = DEVICE_PAGE_MODEL_KEYS.DEFAULT

  if (sessionUser?.username) {
    const preferenceQuery = new URLSearchParams({
      username: sessionUser.username,
      key: DEVICE_PAGE_MODEL,
    })

    const preferenceResponse = await serverApiFetch(
      `/api/auth/me/preferences?${preferenceQuery.toString()}`,
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


