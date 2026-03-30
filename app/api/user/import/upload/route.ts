import { randomUUID } from "crypto"
import { writeFile } from "fs/promises"
import os from "os"
import path from "path"

import { parseString } from "fast-csv"
import { like, sql } from "drizzle-orm"

import { USER_CSV_FIELDS } from "@/constants/user"
import { db } from "@/db"
import { department } from "@/db/schema"

type CsvParseResult = {
	headers: string[]
	rows: Record<string, string>[]
}

type IdNameRecord = {
	id: number
	name: string | null
}

const parseCsvContent = (content: string) =>
	new Promise<CsvParseResult>((resolve, reject) => {
		let headers: string[] = []
		const rows: Record<string, string>[] = []

		parseString(content, {
			headers: true,
			ignoreEmpty: true,
			trim: true,
		})
			.on("headers", (parsedHeaders) => {
				headers = parsedHeaders
			})
			.on("error", (error) => {
				reject(error)
			})
			.on("data", (row) => {
				rows.push(row)
			})
			.on("end", () => {
				resolve({ headers, rows })
			})
	})

const hasValidHeaders = (headers: string[]) =>
	headers.length === USER_CSV_FIELDS.length &&
	headers.every((header, index) => header === USER_CSV_FIELDS[index])

const normalizeCsvValue = (value?: string | null) => (value ?? "").trim()

export async function POST(request: Request) {
	const formData = await request.formData()
	const file = formData.get("file")

	if (!file || !(file instanceof File)) {
		return Response.json({ error: "CSV file is required." }, { status: 400 })
	}

	const content = await file.text()

	if (!content.trim()) {
		return Response.json({ error: "File is empty." }, { status: 400 })
	}

	try {
		const { headers, rows } = await parseCsvContent(content)

		if (!hasValidHeaders(headers)) {
			return Response.json(
				{
					error: "Invalid CSV template headers.",
					expected: USER_CSV_FIELDS,
					received: headers,
				},
				{ status: 400 }
			)
		}

		const importId = `${randomUUID()}.csv`
		const tempFilePath = path.join(os.tmpdir(), importId)
		await writeFile(tempFilePath, content, "utf-8")

		const departmentMap = new Map<string, IdNameRecord[] | null>()
		const departmentCounts = new Map<string, number>()

		const resolveDepartment = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || departmentMap.has(value)) {
				return
			}

			const term = value.toLowerCase()
			const matches = await db
				.select({ id: department.id, name: department.name })
				.from(department)
				.where(like(sql`LOWER(${department.name})`, `%${term}%`))

			departmentMap.set(value, matches.length > 0 ? matches : null)
		}

		for (const row of rows) {
			const departmentValue = normalizeCsvValue(row["Department"])
			if (departmentValue) {
				departmentCounts.set(
					departmentValue,
					(departmentCounts.get(departmentValue) ?? 0) + 1
				)
				await resolveDepartment(departmentValue)
			}
		}

		return Response.json(
			{
				count: rows.length,
				importId,
				found: {
					departmentCounts: Object.fromEntries(departmentCounts.entries()),
				},
				maps: {
					department: Object.fromEntries(departmentMap.entries()),
				},
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error("Failed to parse CSV:", error)
		return Response.json({ error: "Failed to parse CSV file." }, { status: 400 })
	}
}
