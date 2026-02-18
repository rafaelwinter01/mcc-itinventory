import { NextResponse } from "next/server"
import { parseString } from "fast-csv"
import { readFile } from "fs/promises"
import os from "os"
import path from "path"

import { db } from "@/db"
import { license, userLicense } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const importId = body?.importId
		if (!importId || typeof importId !== "string") {
			return NextResponse.json(
				{ error: "importId is required" },
				{ status: 400 }
			)
		}
		const selections = (body?.selections ?? {}) as Record<
			string,
			Array<{ value: string; id: number }>
		>

		const toMap = (items: Array<{ value: string; id: number }>) =>
			new Map(items.map((item) => [item.value, item.id]))

		const userMap = toMap(selections.user ?? [])
		const licenseMap = toMap(selections.license ?? [])

		const tempFilePath = path.join(os.tmpdir(), importId)
		const content = await readFile(tempFilePath, "utf-8")

		const parsed = await new Promise<{
			headers: string[]
			rows: Record<string, string>[]
		}>((resolve, reject) => {
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

		const normalize = (value?: string | null) => (value ?? "").trim()

		const errors: string[] = []
		let insertedCount = 0

		for (const [index, row] of parsed.rows.entries()) {
			const lineNumber = index + 2
			const userEmail = normalize(row.user_email)
			const licenseName = normalize(row.license)
			const cost = normalize(row.cost)
			const billingFrequency = normalize(row.billing_frequency)

			if (!userEmail) {
				errors.push(
					`Line ${lineNumber} - User email is required.`
				)
				continue
			}

			if (!licenseName) {
				errors.push(
					`Line ${lineNumber} - License name is required.`
				)
				continue
			}

			const mappedUserId = userMap.get(userEmail) ?? null
			const mappedLicenseId = licenseMap.get(licenseName) ?? null

			if (!mappedUserId) {
				errors.push(
					`Line ${lineNumber} - User "${userEmail}": not matched.`
				)
				continue
			}

			if (!mappedLicenseId) {
				errors.push(
					`Line ${lineNumber} - License "${licenseName}": not matched.`
				)
				continue
			}

			const existing = await db
				.select({ userId: userLicense.userId })
				.from(userLicense)
				.where(
					and(
						eq(userLicense.userId, mappedUserId),
						eq(userLicense.licenseId, mappedLicenseId)
					)
				)
				.limit(1)

			if (existing.length > 0) {
				errors.push(
					`Line ${lineNumber} - User "${userEmail}": license already assigned.`
				)
				continue
			}

			try {
				const [licenseRow] = await db
					.select({ name: license.name })
					.from(license)
					.where(eq(license.id, mappedLicenseId))

				await db.insert(userLicense).values({
					userId: mappedUserId,
					licenseId: mappedLicenseId,
					cost: cost || null,
					billingFrequency: billingFrequency || null,
					active: true,
				})

				insertedCount += 1

				if (!licenseRow) {
					errors.push(
						`Line ${lineNumber} - License ID ${mappedLicenseId} not found for history.`
					)
				}
			} catch (insertError) {
				console.error("Failed to insert user license:", insertError)
				errors.push(
					`Line ${lineNumber} - User "${userEmail}": Failed to insert record.`
				)
			}
		}

		const totalRead = parsed.rows.length
		let condition: "Success" | "Partial" | "Error" = "Partial"
		let message = "Partial. Some records could not be inserted."

		if (insertedCount === totalRead) {
			condition = "Success"
			message = "Success. All records were inserted."
		} else if (insertedCount === 0) {
			condition = "Error"
			message = "Error. No records were inserted."
		}

		return NextResponse.json(
			{
				condition,
				message,
				errors,
				totalRead,
				totalInserted: insertedCount,
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error("Failed to process import:", error)
		return NextResponse.json(
			{ error: "Failed to process import" },
			{ status: 400 }
		)
	}
}
