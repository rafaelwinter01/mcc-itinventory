import { readFile } from "fs/promises"
import os from "os"
import path from "path"

import { parseString } from "fast-csv"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { user } from "@/db/schema"

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const importId = body?.importId
		if (!importId || typeof importId !== "string") {
			return NextResponse.json({ error: "importId is required" }, { status: 400 })
		}

		const selections = (body?.selections ?? {}) as Record<
			string,
			Array<{ value: string; id: number }>
		>

		const departmentMap = new Map(
			(selections.department ?? []).map((item) => [item.value, item.id])
		)

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
			const firstName = normalize(row["First Name"])
			const lastName = normalize(row["Last Name"])
			const email = normalize(row.Email)
			const departmentName = normalize(row.Department)

			if (!firstName) {
				errors.push(`Line ${lineNumber} - First Name is required.`)
				continue
			}

			if (!lastName) {
				errors.push(`Line ${lineNumber} - Last Name is required.`)
				continue
			}

			const mappedDepartmentId = departmentName
				? (departmentMap.get(departmentName) ?? null)
				: null

			if (departmentName && !mappedDepartmentId) {
				errors.push(
					`Line ${lineNumber} - Department "${departmentName}": not matched.`
				)
				continue
			}

			if (email) {
				const existing = await db
					.select({ id: user.id })
					.from(user)
					.where(eq(user.email, email))
					.limit(1)

				if (existing.length > 0) {
					errors.push(`Line ${lineNumber} - Email "${email}": already exists.`)
					continue
				}
			}

			try {
				await db.insert(user).values({
					firstname: firstName,
					lastname: lastName,
					email: email || null,
					departmentId: mappedDepartmentId,
				})

				insertedCount += 1
			} catch (insertError) {
				console.error("Failed to insert user:", insertError)
				errors.push(
					`Line ${lineNumber} - User "${firstName} ${lastName}": Failed to insert record.`
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
		return NextResponse.json({ error: "Failed to process import" }, { status: 400 })
	}
}
