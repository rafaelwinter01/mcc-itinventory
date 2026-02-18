import { DEVICE_CSV_FIELDS } from "@/constants/device"

const TEMPLATE_FILENAME = "device-import-template.csv"

const buildCsvTemplate = () => `${DEVICE_CSV_FIELDS.join(",")}\n`

export async function GET() {
	const csvTemplate = buildCsvTemplate()

	return new Response(csvTemplate, {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="${TEMPLATE_FILENAME}"`,
		},
	})
}
