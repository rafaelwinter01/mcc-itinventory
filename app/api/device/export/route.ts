import { NextResponse } from "next/server"
import { and, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm"
import { db } from "@/db"
import {
  device,
	deviceComputer,
	deviceLifecycle,
  deviceType,
  status,
  location,
	department,
  makeModel,
  userDevice,
  user,
} from "@/db/schema"
import { alias } from "drizzle-orm/mysql-core"

type AppliedFilter = {
  name: string
  value: string
}

type ExportPayload = {
  selectedIds: number[]
  allIds: number[]
  selectedFields: string[]
  allFields: string[]
  appliedFilters: AppliedFilter[]
  includesOnlySelected: boolean
  includesRowsNotListed: boolean
}

const escapeCsv = (value: unknown) => {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes("\"") || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/\"/g, '""')}"`
  }
  return str
}

const resolveFieldValue = (row: {
  device: typeof device.$inferSelect
	computer?: typeof deviceComputer.$inferSelect | null
	lifecycle?: typeof deviceLifecycle.$inferSelect | null
  type?: { name: string | null } | null
  status?: { name: string | null } | null
  location?: { name: string | null } | null
	billedToLocation?: { name: string | null } | null
	costToLocation?: { name: string | null } | null
  makeModel?: { make: string | null; model: string | null } | null
  assignedUser?: { firstname: string; lastname: string; email?: string | null } | null
}, key: string) => {
  switch (key) {
    case "deviceTypeId":
      return row.type?.name ?? ""
    case "statusId":
      return row.status?.name ?? ""
    case "locationId":
      return row.location?.name ?? ""
    case "makeModelId":
      return row.makeModel
        ? `${row.makeModel.make ?? ""} ${row.makeModel.model ?? ""}`.trim()
        : ""
    case "assignedUserId":
      return row.assignedUser
        ? `${row.assignedUser.firstname} ${row.assignedUser.lastname}`.trim()
        : ""
		case "computerOs":
			return row.computer?.os ?? ""
		case "computerDomain":
			return row.computer?.domain ?? ""
		case "purchaseDate":
			return row.lifecycle?.purchaseDate ?? ""
		case "endOfLife":
			return row.lifecycle?.endOfLife ?? ""
		case "expectedReplacementYear":
			return row.lifecycle?.expectedReplacementYear ?? ""
		case "planDescription":
			return row.lifecycle?.planDescription ?? ""
		case "billedTo":
			return row.billedToLocation?.name ?? ""
		case "costTo":
			return row.costToLocation?.name ?? ""
    default:
      return (row.device as Record<string, unknown>)[key] ?? ""
  }
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as ExportPayload

		if (!body?.selectedFields || body.selectedFields.length === 0) {
			return NextResponse.json(
				{ error: "selectedFields is required" },
				{ status: 400 }
			)
		}

		const selectedIds = (body.selectedIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id))
		const allIds = (body.allIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id))

		const appliedFilterMap = (body.appliedFilters || []).reduce<Record<string, string>>(
			(acc, filter) => {
				acc[filter.name] = filter.value
				return acc
			},
			{}
		)

		const filters = [] as Array<ReturnType<typeof and>>
		const name = appliedFilterMap.name?.toLowerCase().trim()
		const statusId = appliedFilterMap.statusId
		const deviceTypeId = appliedFilterMap.deviceTypeId
		const locationId = appliedFilterMap.locationId
		const makeModelId = appliedFilterMap.makeModelId
		const warrantyEndStart = appliedFilterMap.warrantyEndStart
		const warrantyEndEnd = appliedFilterMap.warrantyEndEnd
		const q = appliedFilterMap.q?.toLowerCase().trim()

		if (name) {
			filters.push(like(sql`LOWER(${device.name})`, `%${name}%`) as any)
		}

		if (statusId) {
			filters.push(eq(device.statusId, Number(statusId)) as any)
		}

		if (deviceTypeId) {
			filters.push(eq(device.deviceTypeId, Number(deviceTypeId)) as any)
		}

		if (locationId) {
			filters.push(eq(device.locationId, Number(locationId)) as any)
		}

		if (makeModelId) {
			filters.push(eq(device.makeModelId, Number(makeModelId)) as any)
		}

		if (q) {
			filters.push(
				or(
					like(sql`LOWER(${device.name})`, `%${q}%`),
					like(sql`LOWER(${device.serialNumber})`, `%${q}%`),
					like(sql`LOWER(${device.macAddress})`, `%${q}%`),
					like(sql`LOWER(${device.description})`, `%${q}%`)
				) as any
			)
		}

		if (warrantyEndStart) {
			filters.push(gte(device.warrantyEnd, new Date(warrantyEndStart)) as any)
		}
		if (warrantyEndEnd) {
			filters.push(lte(device.warrantyEnd, new Date(warrantyEndEnd)) as any)
		}

		const whereClause = filters.length > 0 ? and(...filters) : undefined
		const billedToLocation = alias(department, "billed_to_department")
		const costToLocation = alias(department, "cost_to_department")

		let idFilter: number[] | undefined
		if (body.includesOnlySelected) {
			idFilter = selectedIds
		} else if (!body.includesRowsNotListed) {
			idFilter = allIds
		}

		const rows = await db
			.select({
				device,
				computer: deviceComputer,
				lifecycle: deviceLifecycle,
				type: deviceType,
				status,
				location,
				billedToLocation,
				costToLocation,
				makeModel,
				assignedUser: user,
			})
			.from(device)
			.leftJoin(deviceType, eq(device.deviceTypeId, deviceType.id))
			.leftJoin(status, eq(device.statusId, status.id))
			.leftJoin(location, eq(device.locationId, location.id))
			.leftJoin(makeModel, eq(device.makeModelId, makeModel.id))
			.leftJoin(deviceComputer, eq(deviceComputer.deviceId, device.id))
			.leftJoin(deviceLifecycle, eq(deviceLifecycle.deviceId, device.id))
			.leftJoin(billedToLocation, eq(deviceLifecycle.billedTo, billedToLocation.id))
			.leftJoin(costToLocation, eq(deviceLifecycle.costTo, costToLocation.id))
			.leftJoin(
				userDevice,
				and(eq(userDevice.deviceId, device.id), eq(userDevice.assigned, true))
			)
			.leftJoin(user, eq(user.id, userDevice.userId))
			.where(
				idFilter && idFilter.length > 0
					? and(whereClause, inArray(device.id, idFilter))
					: whereClause
				)

		const headers = body.selectedFields
		const csvRows = [headers.map(escapeCsv).join(",")]

		for (const row of rows) {
			const values = headers.map((key) =>
				escapeCsv(resolveFieldValue(row, key))
			)
			csvRows.push(values.join(","))
		}

		const csv = csvRows.join("\n")

        console.log('Generated CSV content:\n', csv)

		return new NextResponse(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": "attachment; filename=devices-export.csv",
			},
		})
	} catch (error) {
		console.error("Error receiving export payload:", error)
		return NextResponse.json(
			{ error: "Failed to process export request" },
			{ status: 500 }
		)
	}
}
