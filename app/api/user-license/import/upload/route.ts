import { parseString } from "fast-csv"
import { writeFile } from "fs/promises"
import { randomUUID } from "crypto"
import os from "os"
import path from "path"

import { db } from "@/db"
import { license, user } from "@/db/schema"
import { USER_LICENSE_CSV_FIELDS } from "@/constants/user-license"
import { like, or, sql } from "drizzle-orm"

type CsvParseResult = {
	headers: string[]
	rows: Record<string, string>[]
}

type IdNameRecord = {
	id: number
	name: string
}

type IdValueRecord = {
	id: number
	value: string
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
	headers.length === USER_LICENSE_CSV_FIELDS.length &&
	headers.every((header, index) => header === USER_LICENSE_CSV_FIELDS[index])

const normalizeCsvValue = (value?: string | null) => (value ?? "").trim()

const toSearchTokens = (value: string) =>
	value
		.split(/[ .]+/g)
		.map((token) => token.trim())
		.filter((token) => token.length >= 3)

export async function POST(request: Request) {
	const formData = await request.formData()
	const file = formData.get("file")

	if (!file || !(file instanceof File)) {
		return Response.json(
			{ error: "CSV file is required." },
			{ status: 400 }
		)
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
					expected: USER_LICENSE_CSV_FIELDS,
					received: headers,
				},
				{ status: 400 }
			)
		}

		const importId = `${randomUUID()}.csv`
		const tempFilePath = path.join(os.tmpdir(), importId)
		await writeFile(tempFilePath, content, "utf-8")

		const userMap = new Map<string, IdValueRecord[] | null>()
		const licenseMap = new Map<string, IdNameRecord[] | null>()
		const licenseCounts = new Map<string, number>()

		const resolveUser = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || userMap.has(value)) {
				return
			}

			const tokens = toSearchTokens(value)
			if (tokens.length === 0) {
				userMap.set(value, null)
				return
			}

			const conditions = tokens.flatMap((token) => {
				const term = token.toLowerCase()
				return [like(sql`LOWER(${user.email})`, `%${term}%`)]
			})

			const matches = await db
				.select({
					id: user.id,
					firstname: user.firstname,
					lastname: user.lastname,
					email: user.email,
				})
				.from(user)
				.where(or(...conditions))

			const mapped = matches.map((match) => ({
				id: match.id,
				value: `${match.firstname} ${match.lastname}`.trim() +
					(match.email ? ` (${match.email})` : ""),
			}))

			userMap.set(value, mapped.length > 0 ? mapped : null)
		}

		const resolveLicense = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || licenseMap.has(value)) {
				return
			}

			const term = value.toLowerCase()
			const matches = await db
				.select({ id: license.id, name: license.name })
				.from(license)
				.where(like(sql`LOWER(${license.name})`, `%${term}%`))

			licenseMap.set(value, matches.length > 0 ? matches : null)
		}

		for (const row of rows) {
			const licenseValue = normalizeCsvValue(row.license)
			if (licenseValue) {
				licenseCounts.set(
					licenseValue,
					(licenseCounts.get(licenseValue) ?? 0) + 1
				)
			}

			await Promise.all([
				resolveUser(row.user_email),
				resolveLicense(row.license),
			])
		}

		const mapToRecord = <T,>(map: Map<string, T>) =>
			Object.fromEntries(map.entries())

		return Response.json(
			{
				count: rows.length,
				importId,
				found: {
					licenseCounts: mapToRecord(licenseCounts),
				},
				maps: {
					user: mapToRecord(userMap),
					license: mapToRecord(licenseMap),
				},
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error("Failed to parse CSV:", error)
		return Response.json(
			{ error: "Failed to parse CSV file." },
			{ status: 400 }
		)
	}
}
