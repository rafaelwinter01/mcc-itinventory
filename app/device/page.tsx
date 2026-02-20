import { DeviceCard } from "@/components/device-card"
import { DeviceFilterBar } from "@/components/device-filter-bar"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { deviceType, location, status } from "@/db/schema"
import {
	DEVICES_PER_PAGE,
	type DeviceFilterState,
	type DeviceRecord,
	type DeviceFilterOption,
} from "@/lib/device-constants"
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"
import { asc } from "drizzle-orm"
import Link from "next/link"
import { Icon, Import, PackagePlus, Plus } from "lucide-react"

type DevicePageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

type DeviceApiResponse = {
	data: DeviceRecord[]
	limit: number
	offset: number
	total: number
}

type FilterRow = {
	id: number
	name: string | null
}

const buildFilterOptions = (
	rows: FilterRow[],
	allLabel: string
): DeviceFilterOption[] => [
	{ label: allLabel, value: "all" },
	...rows.map((row) => ({
		label: row.name?.trim() || `Item ${row.id}`,
		value: String(row.id),
	})),
]

const getParamValue = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) {
		return value[0] ?? ""
	}

	return value ?? ""
}

const normalizeFilters = (
	params: Awaited<DevicePageProps["searchParams"]>
): DeviceFilterState & { page?: string } => ({
	deviceName: getParamValue(params.deviceName),
	deviceType: getParamValue(params.deviceType),
	status: getParamValue(params.status),
	location: getParamValue(params.location),
	warrantyStart: getParamValue(params.warrantyStart),
	warrantyEnd: getParamValue(params.warrantyEnd),
	page: getParamValue(params.page),
})

export default async function DevicePage(props: DevicePageProps) {
	const searchParams = await props.searchParams
	const normalized = normalizeFilters(searchParams)
	const { page: pageParam, ...filterState } = normalized
	const currentPage = Math.max(1, Number(pageParam) || 1)
	const limit = DEVICES_PER_PAGE
	const offset = (currentPage - 1) * limit

	const filterSourcesPromise = Promise.all([
		db
			.select({ id: deviceType.id, name: deviceType.name })
			.from(deviceType)
			.orderBy(asc(deviceType.name)),
		db
			.select({ id: status.id, name: status.name })
			.from(status)
			.orderBy(asc(status.name)),
		db
			.select({ id: location.id, name: location.name })
			.from(location)
			.orderBy(asc(location.name)),
	])
	const query = new URLSearchParams({
		limit: String(limit),
		offset: String(offset),
	})

	if (filterState.deviceName) {
		query.set("name", filterState.deviceName)
	}

	if (filterState.deviceType) {
		query.set("deviceTypeId", filterState.deviceType)
	}

	if (filterState.status) {
		query.set("statusId", filterState.status)
	}

	if (filterState.location) {
		query.set("locationId", filterState.location)
	}

	if (filterState.warrantyStart) {
		query.set("warrantyEndStart", filterState.warrantyStart)
	}

	if (filterState.warrantyEnd) {
		query.set("warrantyEndEnd", filterState.warrantyEnd)
	}

	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
	const response = await fetch(`${baseUrl}/api/device?${query.toString()}`, {
		cache: "no-store",
	})

	if (!response.ok) {
		throw new Error("Failed to load device list.")
	}

	const payload = (await response.json()) as DeviceApiResponse
	const [deviceTypeRows, statusRows, locationRows] = await filterSourcesPromise

	const deviceTypeOptions = buildFilterOptions(deviceTypeRows, "All types")
	const statusOptions = buildFilterOptions(statusRows, "All statuses")
	const locationOptions = buildFilterOptions(locationRows, "All locations")
	const devices = payload.data
	const totalPages = Math.max(1, Math.ceil(payload.total / limit))
	const pageStart = devices.length ? offset + 1 : 0
	const pageEnd = devices.length ? offset + devices.length : 0
	const baseSearchParams = new URLSearchParams();

	(Object.keys(filterState) as (keyof DeviceFilterState)[]).forEach((key) => {
		const value = filterState[key]
		if (value) {
			baseSearchParams.set(key, value)
		}
	})

	return (
		<section className="space-y-8">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight">Device Inventory</h1>
					<p className="text-muted-foreground">
						View and filter IT assets by type, status, location, and warranty validity.
					</p>
				</div>
				<div className="flex gap-2">
					<Button className="flex items-center justify-center" asChild variant={"secondary"}>
						<Link href="/device/import">
							<Import className="size-4" />
							Import Devices
						</Link>
					</Button>
					<Button className="flex items-center justify-center"asChild>
						<Link href="/device/new">
							<PackagePlus className="size-4" />
							Add Device
						</Link>
					</Button>
				</div>
			</div>

			<DeviceFilterBar
				defaultValues={filterState}
				deviceTypeOptions={deviceTypeOptions}
				statusOptions={statusOptions}
				locationOptions={locationOptions}
			/>

			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<p>
					{devices.length
						? `Showing ${pageStart} - ${pageEnd} of ${payload.total} devices`
						: "No devices found"}
				</p>
				<p className="font-medium">
                    {`Max of ${DEVICES_PER_PAGE} cards per page`}
                    </p>
					
                            	</div>

			{devices.length ? (
				<div className="flex flex-col gap-4">
					{devices.map((device) => (
						<DeviceCard key={device.id} device={device} variant="default" />
					))}
				</div>
			) : (
				<div className="rounded-2xl border border-dashed p-10 text-center">
					<p className="text-lg font-medium">No devices match the filters.</p>
					<p className="text-muted-foreground text-sm">
						Adjust criteria or clear filters to try again.
					</p>
				</div>
			)}

			<DevicePagination
				totalPages={totalPages}
				currentPage={currentPage}
				baseSearchParams={baseSearchParams}
			/>
		</section>
	)
}

type DevicePaginationProps = {
	totalPages: number
	currentPage: number
	baseSearchParams: URLSearchParams
}

const buildPages = (totalPages: number, currentPage: number) => {
	const pages: Array<number | "ellipsis"> = []
	const visibleRange = 1
	const firstPage = 1
	const lastPage = totalPages

	const start = Math.max(firstPage + 1, currentPage - visibleRange)
	const end = Math.min(lastPage - 1, currentPage + visibleRange)

	pages.push(firstPage)

	if (start > firstPage + 1) {
		pages.push("ellipsis")
	}

	for (let page = start; page <= end; page += 1) {
		pages.push(page)
	}

	if (end < lastPage - 1) {
		pages.push("ellipsis")
	}

	if (lastPage > firstPage) {
		pages.push(lastPage)
	}

	return pages.filter((value, index, array) => {
		if (value === "ellipsis" && array[index - 1] === "ellipsis") {
			return false
		}

		return true
	})
}

function DevicePagination({
	totalPages,
	currentPage,
	baseSearchParams,
}: DevicePaginationProps) {
	if (totalPages <= 1) {
		return null
	}

	const createHref = (page: number) => {
		const params = new URLSearchParams(baseSearchParams.toString())
		params.set("page", String(page))
		return `?${params.toString()}`
	}

	const pages = buildPages(totalPages, currentPage)

	return (
		<Pagination className="pt-4">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href={createHref(Math.max(1, currentPage - 1))}
						aria-disabled={currentPage === 1}
						className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
				{pages.map((page, index) =>
					page === "ellipsis" ? (
						<PaginationItem key={`ellipsis-${index}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={page}>
							<PaginationLink
								href={createHref(page)}
								isActive={page === currentPage}
							>
								{page}
							</PaginationLink>
						</PaginationItem>
					)
				)}
				<PaginationItem>
					<PaginationNext
						href={createHref(Math.min(totalPages, currentPage + 1))}
						aria-disabled={currentPage === totalPages}
						className={
							currentPage === totalPages
								? "pointer-events-none opacity-50"
								: undefined
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
