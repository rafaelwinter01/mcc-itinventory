export type ReportField = {
	include: boolean
	originalName: string
	label: string
	columnWidth: number | string
	totalFormat: "none" | "count" | "sum"
}

export type ReportData = {
	title: string
	subtitle: string
	fields: ReportField[]
	onlySelectedFields: boolean
	generateTotals: boolean
}