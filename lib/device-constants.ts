import type { DateRange } from "react-day-picker"

export type DeviceStatusInfo = {
  id: number
  name: string | null
  color: string | null
}

export type DeviceTypeInfo = {
  id: number
  name: string | null
}

export type DeviceLocationInfo = {
  id: number
  name: string | null
  address?: string | null
}

export type DeviceMakeModelInfo = {
  id: number
  make: string | null
  model: string | null
}

export type DeviceAssignedUserInfo = {
  id: number
  name: string
  email?: string | null
}

export type DeviceRecord = {
  id: number
  name: string
  deviceTypeId: number
  locationId: number | null
  statusId: number | null
  departmentId: number | null
  makeModelId: number | null
  serialNumber: string | null
  productNumber: string | null
  macAddress: string | null
  warrantyStart: string | null
  warrantyEnd: string | null
  warrantyType: string | null
  cost: number | null
  supportSite: string | null
  driversSite: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  status?: DeviceStatusInfo | null
  type?: DeviceTypeInfo | null
  location?: DeviceLocationInfo | null
  makeModel?: DeviceMakeModelInfo | null
  assignedUser?: DeviceAssignedUserInfo | null
}

export type DeviceFilterState = {
  deviceName?: string
  deviceType?: string
  status?: string
  location?: string
  makeModel?: string
  warrantyStart?: string
  warrantyEnd?: string
}

export type DeviceFilterOption = {
  label: string
  value: string
}

export const DEVICES_PER_PAGE = 20

export const DEVICE_STATUS_OPTIONS: DeviceFilterOption[] = [
  { label: "All statuses", value: "all" },
  { label: "In use", value: "1" },
  { label: "Under maintenance", value: "2" },
  { label: "Spare", value: "3" },
  { label: "Retired", value: "4" },
]

export const DEVICE_TYPE_OPTIONS: DeviceFilterOption[] = [
  { label: "All types", value: "all" },
  { label: "Desktop", value: "1" },
  { label: "Laptop", value: "2" },
  { label: "Server", value: "3" },
  { label: "Peripheral", value: "4" },
]

export const DEVICE_LOCATION_OPTIONS: DeviceFilterOption[] = [
  { label: "All locations", value: "all" },
  { label: "Headquarters", value: "1" },
  { label: "South Zone Branch", value: "2" },
  { label: "North Hub", value: "3" },
]

type Lookup = Record<string, string>

const buildLookup = (options: DeviceFilterOption[]): Lookup =>
  options.reduce<Lookup>((acc, option) => {
    if (option.value) {
      acc[option.value] = option.label
    }

    return acc
  }, {})

const STATUS_LOOKUP = buildLookup(DEVICE_STATUS_OPTIONS)
const TYPE_LOOKUP = buildLookup(DEVICE_TYPE_OPTIONS)
const LOCATION_LOOKUP = buildLookup(DEVICE_LOCATION_OPTIONS)

export const STATUS_STYLES: Record<string, string> = {
  "1": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "2": "bg-amber-50 text-amber-700 border-amber-200",
  "3": "bg-sky-50 text-sky-700 border-sky-200",
  "4": "bg-rose-50 text-rose-700 border-rose-200",
}

const getLabel = (lookup: Lookup, value?: number | string | null) => {
  if (value === null || value === undefined) {
    return "Not specified"
  }

  const key = String(value)
  return lookup[key] ?? "Not specified"
}

export const getStatusLabel = (value?: number | string | null) =>
  getLabel(STATUS_LOOKUP, value)

export const getTypeLabel = (value?: number | string | null) =>
  getLabel(TYPE_LOOKUP, value)

export const getLocationLabel = (value?: number | string | null) =>
  getLabel(LOCATION_LOOKUP, value)

export const parseDateRange = (state: DeviceFilterState): DateRange | undefined => {
  if (!state.warrantyStart && !state.warrantyEnd) {
    return undefined
  }

  return {
    from: state.warrantyStart ? new Date(state.warrantyStart) : undefined,
    to: state.warrantyEnd ? new Date(state.warrantyEnd) : undefined,
  }
}
