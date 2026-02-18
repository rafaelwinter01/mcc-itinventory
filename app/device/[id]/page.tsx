import { notFound } from "next/navigation"

import { DeviceDetails, type DeviceDetailsRecord } from "@/components/device-details"

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

  const response = await fetch(endpoint, {
    cache: "no-store",
    next: { revalidate: 0 },
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

  return <DeviceDetails deviceData={deviceData} variant="default" />
}


