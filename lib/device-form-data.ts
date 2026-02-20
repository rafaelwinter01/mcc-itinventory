import type { DeviceFormValues } from "@/components/device-form"

export type DeviceAttributeRecord = {
  key: string | null
  value: string | null
}

export type DeviceComputerRecord = {
  os?: string | null
  domain?: string | null
  config?: unknown
}

export type DeviceAssignedUserRecord = {
  id: number
  name: string
  email?: string | null
}

export type DeviceRecordForForm = {
  id: number
  name: string
  deviceTypeId: number
  locationId?: number | null
  statusId?: number | null
  makeModelId?: number | null
  serialNumber?: string | null
  productNumber?: string | null
  macAddress?: string | null
  warrantyStart?: string | Date | null
  warrantyEnd?: string | Date | null
  warrantyType?: string | null
  warrantyLink?: string | null
  cost?: string | number | null
  purchaseDate?: string | Date | null
  endOfLife?: string | Date | null
  expectedReplacementYear?: number | null
  planDescription?: string | null
  extraNotes?: string | null
  billedTo?: number | null
  costTo?: number | null
  supportSite?: string | null
  driversSite?: string | null
  description?: string | null
  attributes?: DeviceAttributeRecord[] | null
  computer?: DeviceComputerRecord | null
  assignedUser?: DeviceAssignedUserRecord | null
}

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

export const buildDeviceEndpoint = (deviceId: number) => {
  const baseUrl = resolveBaseUrl()
  return baseUrl ? `${baseUrl}/api/device/${deviceId}` : `http://localhost:3000/api/device/${deviceId}`
}

export async function fetchDeviceRecord(deviceId: number): Promise<DeviceRecordForForm | null> {
  const endpoint = buildDeviceEndpoint(deviceId)

  const response = await fetch(endpoint, {
    cache: "no-store",
    next: { revalidate: 0 },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch device details (${response.status})`)
  }

  return (await response.json()) as DeviceRecordForForm
}

const toDateInputValue = (value?: string | Date | null) => {
  if (!value) return ""
  const parsed = typeof value === "string" ? new Date(value) : value
  if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
    return ""
  }
  return parsed.toISOString().slice(0, 10)
}

const normalizeComputerConfig = (config: unknown) => {
  if (config === null || config === undefined) return ""
  if (typeof config === "string") return config
  try {
    return JSON.stringify(config, null, 2)
  } catch (error) {
    console.error("Failed to stringify computer config", error)
    return ""
  }
}

export const mapDeviceRecordToFormValues = (
  record: DeviceRecordForForm
): DeviceFormValues => ({
  name: record.name ?? "",
  deviceTypeId: record.deviceTypeId ? record.deviceTypeId.toString() : "",
  locationId: record.locationId ? record.locationId.toString() : "",
  statusId: record.statusId ? record.statusId.toString() : "",
  makeModelId: record.makeModelId ? record.makeModelId.toString() : "",
  serialNumber: record.serialNumber ?? "",
  productNumber: record.productNumber ?? "",
  macAddress: record.macAddress ?? "",
  assignedUserId: record.assignedUser ? record.assignedUser.id.toString() : "",
  assignedUserName: record.assignedUser ? record.assignedUser.name : "",
  warrantyStart: toDateInputValue(record.warrantyStart ?? null),
  warrantyEnd: toDateInputValue(record.warrantyEnd ?? null),
  warrantyType: record.warrantyType ?? "",
  warrantyLink: record.warrantyLink ?? "",
  cost: record.cost ? String(record.cost) : "",
  purchaseDate: toDateInputValue(record.purchaseDate ?? null),
  endOfLife: toDateInputValue(record.endOfLife ?? null),
  expectedReplacementYear: record.expectedReplacementYear ? String(record.expectedReplacementYear) : "",
  planDescription: record.planDescription ?? "",
  extraNotes: record.extraNotes ?? "",
  billedTo: record.billedTo ? record.billedTo.toString() : "",
  costTo: record.costTo ? record.costTo.toString() : "",
  supportSite: record.supportSite ?? "",
  driversSite: record.driversSite ?? "",
  description: record.description ?? "",
  attributes:
    record.attributes?.map((attr) => ({
      key: attr.key ?? "",
      value: attr.value ?? "",
    })) ?? [],
  isComputer: Boolean(record.computer?.os || record.computer?.domain || record.computer?.config),
  computer: {
    os: record.computer?.os ?? "",
    domain: record.computer?.domain ?? "",
    config: normalizeComputerConfig(record.computer?.config),
  },
})
