export type ReportField = {
	include: boolean
	originalName: string
	label: string
	columnWidth: number | string
	totalFormat: "none" | "count" | "sum"
}
