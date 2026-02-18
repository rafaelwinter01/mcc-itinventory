import { USER_LICENSE_CSV_FIELDS } from "@/constants/user-license"

const TEMPLATE_FILENAME = "user-license-import-template.csv"

const buildCsvTemplate = () => `${USER_LICENSE_CSV_FIELDS.join(",")}\n`

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
