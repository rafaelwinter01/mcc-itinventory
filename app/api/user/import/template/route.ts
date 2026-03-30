import { USER_CSV_FIELDS } from "@/constants/user"

const TEMPLATE_FILENAME = "user-import-template.csv"

const buildCsvTemplate = () => `${USER_CSV_FIELDS.join(",")}\n`

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
