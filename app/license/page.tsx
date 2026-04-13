import { LicenseFilterBar, type LicenseFilterState } from "@/components/license-filter-bar"
import { LicenseList } from "@/components/license-list"
import { LicensePageHeader } from "@/components/license-page-header"
import type { LicenseCardData, LicenseCardProps } from "@/components/license-card"
import { CARD_MODEL, CARD_MODEL_KEYS } from "@/constants/preferences"
import { getSession } from "@/lib/session"
import { serverApiFetch } from "@/lib/server-api"
import { redirect } from "next/navigation"

type LicensePageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

type LicenseRecord = LicenseCardData

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

const CARD_VARIANTS = new Set<LicenseCardProps["variant"]>(Object.values(CARD_MODEL_KEYS))

const resolveCardVariant = (lastPreference: unknown): LicenseCardProps["variant"] => {
	if (!lastPreference || typeof lastPreference !== "object" || Array.isArray(lastPreference)) {
		return CARD_MODEL_KEYS.DEFAULT
	}

	const parsedLast = lastPreference as PreferenceLast
	const value = typeof parsedLast.cardModel === "string" ? parsedLast.cardModel : parsedLast.value

	if (typeof value === "string" && CARD_VARIANTS.has(value as LicenseCardProps["variant"])) {
		return value as LicenseCardProps["variant"]
	}

	return CARD_MODEL_KEYS.DEFAULT
}

const getParamValue = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) {
		return value[0] ?? ""
	}

	return value ?? ""
}

const normalizeFilters = (
	params: Awaited<LicensePageProps["searchParams"]>
): LicenseFilterState => ({
	name: getParamValue(params.name),
})

export default async function LicensePage(props: LicensePageProps) {
	const searchParams = await props.searchParams
	const filterState = normalizeFilters(searchParams)
	const sessionUser = await getSession()

	const query = new URLSearchParams()
	if (filterState.name) {
		query.set("name", filterState.name)
	}

	let cardVariant: LicenseCardProps["variant"] = CARD_MODEL_KEYS.DEFAULT

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

	const response = await serverApiFetch(`/api/license?${query.toString()}`, {
		cache: "no-store",
	})

	if (response.status === 401) {
		redirect("/login")
	}

	if (!response.ok) {
		throw new Error("Failed to load license list.")
	}

	const licenses = (await response.json()) as LicenseRecord[]

	return (
		<section className="space-y-8">
			<LicensePageHeader
				title="Licenses"
				subtitle="Manage software licenses and billing information."
			/>

			<LicenseFilterBar defaultValues={filterState} />

			{licenses.length ? (
				<LicenseList licenses={licenses} variant={cardVariant} />
			) : (
				<div className="rounded-2xl border border-dashed p-10 text-center">
					<p className="text-lg font-medium">No licenses found.</p>
					<p className="text-muted-foreground text-sm">Adjust the filter or add a license.</p>
				</div>
			)}
		</section>
	)
}
