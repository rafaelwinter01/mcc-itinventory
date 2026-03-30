import { Suspense } from "react"
import { DataTable } from "./data-table"
import { columns, type UserLicenseRow } from "./columns"
import {
  UserLicenseDataFilterBar,
  type UserLicenseFilterState,
} from "@/components/user-license-data-filter-bar"

async function getData(searchParams?: URLSearchParams): Promise<UserLicenseRow[]> {
  try {
    const queryString = searchParams?.toString()
    const url = queryString
      ? `http://localhost:3000/api/user-license?${queryString}&limit=1000`
      : "http://localhost:3000/api/user-license?limit=1000"

    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user licenses")
    }

    const data = await response.json()

    return data.data
  } catch (error) {
    console.error("Error fetching user licenses:", error)
    return []
  }
}

async function getFilterOptions() {
  try {
    const [usersRes, licensesRes] = await Promise.all([
      fetch("http://localhost:3000/api/user"),
      fetch("http://localhost:3000/api/license"),
    ])

    const [usersPayload, licensesPayload] = await Promise.all([
      usersRes.ok ? usersRes.json() : [],
      licensesRes.ok ? licensesRes.json() : [],
    ])

    const normalize = (payload: unknown) =>
      Array.isArray(payload) ? payload : (payload as { data?: unknown[] })?.data || []

    const users = normalize(usersPayload)
    const licenses = normalize(licensesPayload)

    return {
      userOptions:
        users.map((user: { id: number; firstname?: string | null; lastname?: string | null; email?: string | null }) => ({
          label: user.email
            ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() + ` (${user.email})`
            : `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || "Unknown",
          value: user.id.toString(),
        })) || [],
      licenseOptions:
        licenses.map((license: { id: number; name: string }) => ({
          label: license.name,
          value: license.id.toString(),
        })) || [],
    }
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return {
      userOptions: [],
      licenseOptions: [],
    }
  }
}

export default async function UserLicenseDataPage({
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

  const defaultValues: UserLicenseFilterState = {
    query: (resolvedSearchParams?.q as string) || "",
    userId: (resolvedSearchParams?.userId as string) || "all",
    licenseId: (resolvedSearchParams?.licenseId as string) || "all",
    active: (resolvedSearchParams?.active as string) || "all",
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

  const exportFilters = {
    userId: (resolvedSearchParams?.userId as string) || undefined,
    licenseId: (resolvedSearchParams?.licenseId as string) || undefined,
    active: (resolvedSearchParams?.active as string) || undefined,
    q: (resolvedSearchParams?.q as string) || undefined,
  }

  return (
    <div className="mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User License Assignments</h1>
        <p className="text-muted-foreground">
          Manage and view all user license assignments.
        </p>
      </div>
      <div className="mb-6">
        <Suspense fallback={<div>Loading filters...</div>}>
          <UserLicenseDataFilterBar
            defaultValues={defaultValues}
            userOptions={filterOptions.userOptions}
            licenseOptions={filterOptions.licenseOptions}
          />
        </Suspense>
      </div>
      <DataTable
        columns={columns}
        data={data}
        appliedFilters={appliedFilters}
        exportFilters={exportFilters}
      />
    </div>
  )
}
