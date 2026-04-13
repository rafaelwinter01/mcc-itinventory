import { type WorkstationCardData, type WorkstationCardProps } from "@/components/workstation-card"
import { WorkstationFilterBar, type WorkstationFilterState } from "@/components/workstation-filter-bar"
import { WorkstationList } from "@/components/workstation-list"
import { WorkstationPageHeader } from "@/components/workstation-page-header"
import { CARD_MODEL, CARD_MODEL_KEYS } from "@/constants/preferences"
import { getSession } from "@/lib/session"
import { serverApiFetch } from "@/lib/server-api"
import { redirect } from "next/navigation"
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"

type WorkstationPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

type WorkstationListItem = WorkstationCardData

type WorkstationApiResponse = {
	data: WorkstationListItem[]
	limit: number
	offset: number
	total: number
}

type PreferenceLast = {
	cardModel?: unknown
	value?: unknown
}

type PreferenceBucket = {
	last?: Record<string, unknown>
}

type PreferencesResponse = {
	data?: PreferenceBucket
}

const CARD_VARIANTS = new Set<WorkstationCardProps["variant"]>(Object.values(CARD_MODEL_KEYS))

const resolveCardVariant = (lastPreference: unknown): WorkstationCardProps["variant"] => {
	if (!lastPreference || typeof lastPreference !== "object" || Array.isArray(lastPreference)) {
		return CARD_MODEL_KEYS.DEFAULT
	}

	const parsedLast = lastPreference as PreferenceLast
	const value = typeof parsedLast.cardModel === "string" ? parsedLast.cardModel : parsedLast.value

	if (typeof value === "string" && CARD_VARIANTS.has(value as WorkstationCardProps["variant"])) {
		return value as WorkstationCardProps["variant"]
	}

	return CARD_MODEL_KEYS.DEFAULT
}

const WORKSTATIONS_PER_PAGE = 20

const getParamValue = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) {
		return value[0] ?? ""
	}

	return value ?? ""
}

const normalizeFilters = (
	params: Awaited<WorkstationPageProps["searchParams"]>
): WorkstationFilterState & { page?: string } => ({
	name: getParamValue(params.name),
	assignedUser: getParamValue(params.assignedUser),
	deviceName: getParamValue(params.deviceName),
	attributeKey: getParamValue(params.attributeKey),
	attributeValue: getParamValue(params.attributeValue),
	page: getParamValue(params.page),
})

export default async function WorkstationPage(props: WorkstationPageProps) {
	const searchParams = await props.searchParams
	const normalized = normalizeFilters(searchParams)
	const { page: pageParam, ...filterState } = normalized
	const sessionUser = await getSession()
	const currentPage = Math.max(1, Number(pageParam) || 1)
	const limit = WORKSTATIONS_PER_PAGE
	const offset = (currentPage - 1) * limit

	const query = new URLSearchParams({
		limit: String(limit),
		offset: String(offset),
	})

	if (filterState.name) {
		query.set("name", filterState.name)
	}

	if (filterState.assignedUser) {
		query.set("assignedUser", filterState.assignedUser)
	}

	if (filterState.deviceName) {
		query.set("deviceName", filterState.deviceName)
	}

	if (filterState.attributeKey) {
		query.set("attributeKey", filterState.attributeKey)
	}

	if (filterState.attributeValue) {
		query.set("attributeValue", filterState.attributeValue)
	}

	let cardVariant: WorkstationCardProps["variant"] = CARD_MODEL_KEYS.DEFAULT

	if (sessionUser?.username) {
		const preferenceQuery = new URLSearchParams({
			username: sessionUser.username,
			key: CARD_MODEL,
		})

		const preferenceResponse = await serverApiFetch(
			`/api/auth/me/preferences?${preferenceQuery.toString()}`,
			{ cache: "no-store" }
		)

		if (preferenceResponse.ok) {
			const preferencePayload = (await preferenceResponse.json()) as PreferencesResponse
			cardVariant = resolveCardVariant(preferencePayload.data?.last)
		}
	}

	const response = await serverApiFetch(`/api/workstation?${query.toString()}`, {
		cache: "no-store",
	})

	if (response.status === 401) {
		redirect("/login")
	}

	if (!response.ok) {
		throw new Error("Failed to load workstation list.")
	}

	const payload = (await response.json()) as WorkstationApiResponse
	const workstations = payload.data
	const totalPages = Math.max(1, Math.ceil(payload.total / limit))
	const pageStart = workstations.length ? offset + 1 : 0
	const pageEnd = workstations.length ? offset + workstations.length : 0
	const baseSearchParams = new URLSearchParams()

	;(Object.keys(filterState) as (keyof WorkstationFilterState)[]).forEach((key) => {
		const value = filterState[key]
		if (value) {
			baseSearchParams.set(key, value)
		}
	})

	return (
		<section className="space-y-8">
			<WorkstationPageHeader
				title="Workstations"
				subtitle="Browse workstation assignments, devices, and attributes."
			/>

			<WorkstationFilterBar defaultValues={filterState} />

			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<p>
					{workstations.length
						? `Showing ${pageStart} - ${pageEnd} of ${payload.total} workstations`
						: "No workstations found"}
				</p>
				<p className="font-medium">{`Max of ${WORKSTATIONS_PER_PAGE} cards per page`}</p>
			</div>

			{workstations.length ? (
				<WorkstationList workstations={workstations} variant={cardVariant} />
			) : (
				<div className="rounded-2xl border border-dashed p-10 text-center">
					<p className="text-lg font-medium">No workstations match the filters.</p>
					<p className="text-muted-foreground text-sm">
						Adjust criteria or clear filters to try again.
					</p>
				</div>
			)}

			<WorkstationPagination
				totalPages={totalPages}
				currentPage={currentPage}
				baseSearchParams={baseSearchParams}
			/>
		</section>
	)
}

type WorkstationPaginationProps = {
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

function WorkstationPagination({
	totalPages,
	currentPage,
	baseSearchParams,
}: WorkstationPaginationProps) {
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
				{pages.map((page, index) => (
					<PaginationItem key={`${page}-${index}`}>
						{page === "ellipsis" ? (
							<PaginationEllipsis />
						) : (
							<PaginationLink href={createHref(page)} isActive={page === currentPage}>
								{page}
							</PaginationLink>
						)}
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						href={createHref(Math.min(totalPages, currentPage + 1))}
						aria-disabled={currentPage === totalPages}
						className={
							currentPage === totalPages ? "pointer-events-none opacity-50" : undefined
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
