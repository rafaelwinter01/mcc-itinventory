import { parseString } from "fast-csv"
import { writeFile } from "fs/promises"
import { randomUUID } from "crypto"
import os from "os"
import path from "path"

import { db } from "@/db"
import { department, deviceType, location, makeModel, status, user } from "@/db/schema"
import { DEVICE_CSV_FIELDS } from "@/constants/device"
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
	headers.length === DEVICE_CSV_FIELDS.length &&
	headers.every((header, index) => header === DEVICE_CSV_FIELDS[index])

const normalizeCsvValue = (value?: string | null) => (value ?? "").trim()

const toSearchTokens = (value: string) =>
	value
		.split(/[ .]+/g)
		.map((token) => token.trim())
		.filter(Boolean)

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
					expected: DEVICE_CSV_FIELDS,
					received: headers,
				},
				{ status: 400 }
			)
		}

		const importId = `${randomUUID()}.csv`
		const tempFilePath = path.join(os.tmpdir(), importId)
		await writeFile(tempFilePath, content, "utf-8")

		const statusMap = new Map<string, IdNameRecord[] | null>()
		const deviceTypeMap = new Map<string, IdNameRecord[] | null>()
		const locationMap = new Map<string, IdNameRecord[] | null>()
		const billedToMap = new Map<string, IdNameRecord[] | null>()
		const costToMap = new Map<string, IdNameRecord[] | null>()
		const userMap = new Map<string, IdValueRecord[] | null>()
		const makeModelMap = new Map<string, IdValueRecord[] | null>()
		const deviceTypeCounts = new Map<string, number>()

		const resolveStatus = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || statusMap.has(value)) {
				return
			}

			const term = value.toLowerCase()
			const matches = await db
				.select({ id: status.id, name: status.name })
				.from(status)
				.where(like(sql`LOWER(${status.name})`, `%${term}%`))

			statusMap.set(value, matches.length > 0 ? matches : null)
		}

		const resolveDeviceType = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || deviceTypeMap.has(value)) {
				return
			}

			const term = value.toLowerCase()
			const matches = await db
				.select({ id: deviceType.id, name: deviceType.name })
				.from(deviceType)
				.where(like(sql`LOWER(${deviceType.name})`, `%${term}%`))

			deviceTypeMap.set(value, matches.length > 0 ? matches : null)
		}

		const resolveLocation = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || locationMap.has(value)) {
				return
			}

			const term = value.toLowerCase()
			const matches = await db
				.select({ id: location.id, name: location.name })
				.from(location)
				.where(like(sql`LOWER(${location.name})`, `%${term}%`))

			locationMap.set(value, matches.length > 0 ? matches : null)
		}

		const resolveBilledTo = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || billedToMap.has(value)) {
				return
			}

			const term = value.toLowerCase()
			const matches = await db
				.select({ id: department.id, name: department.name })
				.from(department)
				.where(like(sql`LOWER(${department.name})`, `%${term}%`))

			const mappedMatches = matches.map((item) => ({
				id: item.id,
				name: item.name ?? "",
			}))

			billedToMap.set(value, mappedMatches.length > 0 ? mappedMatches : null)
		}

		const resolveCostTo = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || costToMap.has(value)) {
				return
			}

			const term = value.toLowerCase()
			const matches = await db
				.select({ id: department.id, name: department.name })
				.from(department)
				.where(like(sql`LOWER(${department.name})`, `%${term}%`))

			const mappedMatches = matches.map((item) => ({
				id: item.id,
				name: item.name ?? "",
			}))

			costToMap.set(value, mappedMatches.length > 0 ? mappedMatches : null)
		}

		const resolveUsers = async (rawValue: string) => {
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
				return [
					like(sql`LOWER(${user.firstname})`, `%${term}%`),
					like(sql`LOWER(${user.lastname})`, `%${term}%`),
				]
			})

			const matches = await db
				.select({
					id: user.id,
					firstname: user.firstname,
					lastname: user.lastname,
				})
				.from(user)
				.where(or(...conditions))

			const mapped = matches.map((match) => ({
				id: match.id,
				value: `${match.firstname} ${match.lastname}`.trim(),
			}))

			userMap.set(value, mapped.length > 0 ? mapped : null)
		}

		const resolveMakeModel = async (rawValue: string) => {
			const value = normalizeCsvValue(rawValue)
			if (!value || makeModelMap.has(value)) {
				return
			}

			const tokens = toSearchTokens(value)
			if (tokens.length === 0) {
				makeModelMap.set(value, null)
				return
			}

			const conditions = tokens.flatMap((token) => {
				const term = token.toLowerCase()
				return [
					like(sql`LOWER(${makeModel.make})`, `%${term}%`),
					like(sql`LOWER(${makeModel.model})`, `%${term}%`),
				]
			})

			const matches = await db
				.select({
					id: makeModel.id,
					make: makeModel.make,
					model: makeModel.model,
				})
				.from(makeModel)
				.where(or(...conditions))

			const mapped = matches.map((match) => ({
				id: match.id,
				value: `${match.make} ${match.model}`.trim(),
			}))

			makeModelMap.set(value, mapped.length > 0 ? mapped : null)
		}

		for (const row of rows) {
			const typeValue = normalizeCsvValue(row.type)
			if (typeValue) {
				deviceTypeCounts.set(
					typeValue,
					(deviceTypeCounts.get(typeValue) ?? 0) + 1
				)
			}
			await Promise.all([
				resolveStatus(row.status),
				resolveDeviceType(row.type),
				resolveLocation(row.location),
				resolveBilledTo(row.billedto),
				resolveCostTo(row.costto),
				resolveUsers(row.user),
				resolveMakeModel(row["make-model"]),
			])
		}

		const mapToRecord = <T,>(map: Map<string, T>) =>
			Object.fromEntries(map.entries())

		const deviceTypeCountRecord = mapToRecord(deviceTypeCounts)

		return Response.json(
			{
				count: rows.length,
				importId,
				found: {
					deviceTypeCounts: deviceTypeCountRecord,
				},
				maps: {
					status: mapToRecord(statusMap),
					devicetype: mapToRecord(deviceTypeMap),
					location: mapToRecord(locationMap),
					billedto: mapToRecord(billedToMap),
					costto: mapToRecord(costToMap),
					user: mapToRecord(userMap),
					makemodel: mapToRecord(makeModelMap),
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
