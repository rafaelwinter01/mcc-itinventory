import { LicenseFilterBar, type LicenseFilterState } from "@/components/license-filter-bar"
import { LicenseList } from "@/components/license-list"
import { LicensePageHeader } from "@/components/license-page-header"
import type { LicenseCardData } from "@/components/license-card"

type LicensePageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

type LicenseRecord = LicenseCardData

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

	const query = new URLSearchParams()
	if (filterState.name) {
		query.set("name", filterState.name)
	}

	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
	const response = await fetch(`${baseUrl}/api/license?${query.toString()}`, {
		cache: "no-store",
	})

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
				<LicenseList licenses={licenses} />
			) : (
				<div className="rounded-2xl border border-dashed p-10 text-center">
					<p className="text-lg font-medium">No licenses found.</p>
					<p className="text-muted-foreground text-sm">Adjust the filter or add a license.</p>
				</div>
			)}
		</section>
	)
}
