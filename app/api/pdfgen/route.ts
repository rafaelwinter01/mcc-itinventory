import path from "node:path";
import pdfmake from "pdfmake";
import { NextResponse } from "next/server";

type PdfReportPayload = {
	reportTitle: string;
	reportSubtitle: string;
	generateTotals?: boolean;
	columnsTitle?: string[];
	fields:
		| unknown[][]
		| Array<{
			index?: number;
			include?: boolean;
			originalField?: string;
			customTitle?: string;
			columnWidth?: string;
			totalFormat?: "none" | "count" | "sum";
		}>;
	rows?: unknown[][];
};

export const runtime = "nodejs";

const pdf = pdfmake;

pdf.setFonts({
	Roboto: {
		normal: path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto", "Roboto-Regular.ttf"),
		bold: path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto", "Roboto-Medium.ttf"),
		italics: path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto", "Roboto-Italic.ttf"),
		bolditalics: path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto", "Roboto-MediumItalic.ttf"),
	},
});

const toCellValue = (value: unknown): string => {
	if (value === null || value === undefined || value === "") {
		return "-";
	}

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? "-" : value.toLocaleDateString("en-US");
	}

	if (typeof value === "object") {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	return String(value);
};

const sanitizeFilename = (value: string) => {
	const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
	const safe = normalized.replace(/[^a-z0-9-_]/g, "");
	return safe || "report";
};

const isEmptyTotalValue = (value: unknown) => {
	if (value === null || value === undefined) {
		return true;
	}

	const normalized = String(value).trim();
	return normalized === "" || normalized === "-";
};

const toNumericTotalValue = (value: unknown): number | null => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value !== "string") {
		return null;
	}

	const normalized = value
		.trim()
		.replace(/[$€£¥\s]/g, "")
		.replace(/,/g, "");

	if (normalized === "" || normalized === "-") {
		return null;
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
};

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as Partial<PdfReportPayload>;

		const reportTitle = typeof body.reportTitle === "string" ? body.reportTitle.trim() : "";
		const reportSubtitle = typeof body.reportSubtitle === "string" ? body.reportSubtitle.trim() : "";
		const generateTotals = body.generateTotals === true;
		const columnsTitle = Array.isArray(body.columnsTitle) ? body.columnsTitle.map((item) => String(item ?? "")) : [];
		const fieldObjects = Array.isArray(body.fields) && body.fields.every((item) => !Array.isArray(item) && typeof item === "object" && item !== null)
			? (body.fields as Array<{ index?: number; include?: boolean; originalField?: string; customTitle?: string; columnWidth?: string; totalFormat?: "none" | "count" | "sum" }>)
			: null;
		const legacyFields = Array.isArray(body.fields) && body.fields.every((item) => Array.isArray(item))
			? (body.fields as unknown[][])
			: [];

		const rows = Array.isArray(body.rows)
			? body.rows.map((row) => (Array.isArray(row) ? row : [row]))
			: legacyFields.map((row) => (Array.isArray(row) ? row : [row]));

		const selectedColumns = fieldObjects
			? fieldObjects
				.filter((field) => field.include !== false)
				.map((field, fallbackIndex) => ({
					index: typeof field.index === "number" ? field.index : fallbackIndex,
					totalFormat: field.totalFormat === "sum" ? "sum" : field.totalFormat === "none" ? "none" : "count",
					originalField:
						typeof field.originalField === "string" && field.originalField.trim() !== ""
							? field.originalField.trim()
							: columnsTitle[fallbackIndex] ?? `Column ${fallbackIndex + 1}`,
					title:
						typeof field.customTitle === "string" && field.customTitle.trim() !== ""
							? field.customTitle.trim()
							: (typeof field.originalField === "string" && field.originalField.trim() !== ""
								? field.originalField.trim()
								: columnsTitle[fallbackIndex] ?? `Column ${fallbackIndex + 1}`),
				}))
				: columnsTitle.map((title, index) => ({ index, totalFormat: "count" as const, originalField: title, title }));

		if (selectedColumns.length === 0) {
			return NextResponse.json(
				{ ok: false, error: "At least one field with customTitle must be provided." },
				{ status: 400 }
			);
		}

		const tableBody: Array<Array<string | { text: string; bold?: boolean }>> = [
			selectedColumns.map((column) => ({ text: column.title, bold: true })),
			...rows.map((row) =>
				selectedColumns.map((column) => {
					const value = row[column.index];
					return toCellValue(value);
				})
			),
		];

		if (generateTotals) {
			const totalRow = selectedColumns.map((column, columnIndex) => {
				if (columnIndex === 0) {
					return { text: "TOTAL", bold: true };
				}

				if (column.totalFormat === "none") {
					return { text: "", bold: true };
				}

				if (column.totalFormat === "sum") {
					const sum = rows.reduce((accumulator, row) => {
						const numericValue = toNumericTotalValue(row[column.index]);
						return numericValue === null ? accumulator : accumulator + numericValue;
					}, 0);

					const formattedSum = Number.isInteger(sum) ? String(sum) : String(Number(sum.toFixed(2)));
					return { text: formattedSum, bold: true };
				}

				const count = rows.reduce((accumulator, row) => {
					const value = row[column.index];
					return isEmptyTotalValue(value) ? accumulator : accumulator + 1;
				}, 0);

				return { text: String(count), bold: true };
			});

			tableBody.push(totalRow);
		}

		const generatedAt = new Date().toLocaleString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		const columnsSize = selectedColumns.map((column) => {
			if (!fieldObjects) {
				return "auto";
			}

			const field = fieldObjects.find((item) => {
				const fieldIndex = typeof item.index === "number" ? item.index : -1;
				return fieldIndex === column.index && item.include !== false;
			});

			if (!field || typeof field.columnWidth !== "string") {
				return "auto";
			}

			const trimmedWidth = field.columnWidth.trim();
			if (trimmedWidth === "" || trimmedWidth.toLowerCase() === "auto") {
				return "auto";
			}

			const widthNumber = Number(trimmedWidth);
			return Number.isFinite(widthNumber) ? widthNumber : "auto";
		});

		const docDefinition: any = {
			pageOrientation: "landscape",
			defaultStyle: {
				font: "Roboto",
				fontSize: 10,
			},
			pageMargins: [32, 32, 32, 32],
			footer: (currentPage: number, pageCount: number) => ({
				columns: [
					{ text: `Generated at: ${generatedAt}`, alignment: "left" },
					{ text: `Page ${currentPage} of ${pageCount}`, alignment: "right" },
				],
				margin: [32, 0, 32, 16],
				fontSize: 8,
				color: "gray",
			}),
			content: [
				{ text: reportTitle || "Report", fontSize: 20, bold: true, margin: [0, 0, 0, 4] },
				{ text: reportSubtitle || "", fontSize: 10, margin: [0, 0, 0, 14] },
				{
					table: {
						headerRows: 1,
						// widths: Array(selectedColumns.length).fill("auto"),
						widths: columnsSize,
						body: tableBody,
					},
					layout: "lightHorizontalLines",
				},
			],
		};

		const buffer = await pdf.createPdf(docDefinition).getBuffer();
		const bytes = new Uint8Array(buffer);
		const filename = `${sanitizeFilename(reportTitle || "report")}.pdf`;

		return new NextResponse(bytes, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Content-Length": String(bytes.byteLength),
			},
		});
	} catch (error) {
		console.error("[pdfgen] error:", error);
		return NextResponse.json({ ok: false, error: "Failed to generate PDF." }, { status: 500 });
	}
}
