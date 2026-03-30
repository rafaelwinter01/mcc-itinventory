import { Suspense } from "react"
import { DataTable } from "./data-table"
import { columns, Device } from "./columns"
import { DeviceDataFilterBar } from "@/components/device-data-filter-bar"
import { type DeviceFilterState } from "@/lib/device-constants"

async function getData(searchParams?: URLSearchParams): Promise<Device[]> {
  try {
    const queryString = searchParams?.toString()
    const url = queryString
      ? `http://localhost:3000/api/device?${queryString}&limit=1000`
      : "http://localhost:3000/api/device?limit=1000"


      console.log('Fetching devices from URL:', url)
    const response = await fetch(url, {
      cache: 'no-store' // Ensure fresh data on each request
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch devices')
    }

    const data = await response.json()

    return data.data
  } catch (error) {
    console.error('Error fetching devices:', error)
    return []
  }
}

async function getFilterOptions() {
  try {
    const [deviceTypesRes, statusRes, locationsRes, makeModelsRes] = await Promise.all([
      fetch("http://localhost:3000/api/devicetype"),
      fetch("http://localhost:3000/api/status"),
      fetch("http://localhost:3000/api/location"),
      fetch("http://localhost:3000/api/makemodel"),
    ])

    const [deviceTypes, statuses, locations, makeModels] = await Promise.all([
      deviceTypesRes.ok ? deviceTypesRes.json() : { data: [] },
      statusRes.ok ? statusRes.json() : { data: [] },
      locationsRes.ok ? locationsRes.json() : { data: [] },
      makeModelsRes.ok ? makeModelsRes.json() : { data: [] },
    ])

    const normalize = (payload: unknown) =>
      Array.isArray(payload) ? payload : (payload as { data?: unknown[] })?.data || []

    const deviceTypeList = normalize(deviceTypes)
    const statusList = normalize(statuses)
    const locationList = normalize(locations)
    const makeModelList = normalize(makeModels)

    return {
      deviceTypeOptions:
        deviceTypeList.map((type: { id: number; name: string }) => ({
          label: type.name,
          value: type.id.toString(),
        })) || [],
      statusOptions:
        statusList.map((status: { id: number; name: string }) => ({
          label: status.name,
          value: status.id.toString(),
        })) || [],
      locationOptions:
        locationList.map((location: { id: number; name: string }) => ({
          label: location.name,
          value: location.id.toString(),
        })) || [],
      makeModelOptions:
        makeModelList.map((makeModel: { id: number; make?: string | null; model?: string | null }) => ({
          label: `${makeModel.make ?? ""} ${makeModel.model ?? ""}`.trim() || "Unknown",
          value: makeModel.id.toString(),
        })) || [],
    }
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return {
      deviceTypeOptions: [],
      statusOptions: [],
      locationOptions: [],
      makeModelOptions: [],
    }
  }
}

export default async function DeviceDataPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const urlSearchParams = new URLSearchParams()

  if (resolvedSearchParams) {
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((entry) => urlSearchParams.append(key, entry))
        } else {
          urlSearchParams.set(key, value)
        }
      }
    })
  }

  const [data, filterOptions] = await Promise.all([
    getData(urlSearchParams),
    getFilterOptions(),
  ])

  const defaultValues: DeviceFilterState = {
    deviceName: (resolvedSearchParams?.name as string) || "",
    deviceType: (resolvedSearchParams?.deviceTypeId as string) || "all",
    status: (resolvedSearchParams?.statusId as string) || "all",
    location: (resolvedSearchParams?.locationId as string) || "all",
    makeModel: (resolvedSearchParams?.makeModelId as string) || "all",
    warrantyStart: (resolvedSearchParams?.warrantyEndStart as string) || "",
    warrantyEnd: (resolvedSearchParams?.warrantyEndEnd as string) || "",
  }

  const appliedFilters = Object.entries(resolvedSearchParams ?? {})
    .flatMap(([name, value]) => {
      if (!value) return []
      if (Array.isArray(value)) {
        const joined = value.filter(Boolean).join(", ")
        return joined ? [{ name, value: joined }] : []
      }
      return value ? [{ name, value }] : []
    })

  return (
    <div className="mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Device Management</h1>
        <p className="text-muted-foreground">
          Manage and view all devices in your inventory.
        </p>
      </div>
      <div className="mb-6">
        <Suspense fallback={<div>Loading filters...</div>}>
          <DeviceDataFilterBar
            defaultValues={defaultValues}
            deviceTypeOptions={filterOptions.deviceTypeOptions}
            statusOptions={filterOptions.statusOptions}
            locationOptions={filterOptions.locationOptions}
            makeModelOptions={filterOptions.makeModelOptions}
          />
        </Suspense>
        <p className="text-sm text-muted-foreground mt-2">
          * Note: Filters are currently client-side only and may not reflect all available options if the dataset is large.
        </p>
      </div>
      <DataTable columns={columns} data={data} appliedFilters={appliedFilters} />
    </div>
  )
}
