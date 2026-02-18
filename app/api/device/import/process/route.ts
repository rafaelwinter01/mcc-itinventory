import { NextResponse } from "next/server"
import { parseString } from "fast-csv"
import { readFile } from "fs/promises"
import os from "os"
import path from "path"

import { db } from "@/db"
import { device, deviceComputer, deviceLifecycle } from "@/db/schema"

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

		const statusMap = toMap(selections.status ?? [])
		const deviceTypeMap = toMap(selections.devicetype ?? [])
		const locationMap = toMap(selections.location ?? [])
		const billedToMap = toMap(selections.billedto ?? [])
		const costToMap = toMap(selections.costto ?? [])
		const userMap = toMap(selections.user ?? [])
		const makeModelMap = toMap(selections.makemodel ?? [])

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
		const parseDate = (value?: string | null) => {
			const normalized = normalize(value)
			if (!normalized) {
				return null
			}
			const parsedDate = new Date(normalized)
			if (Number.isNaN(parsedDate.getTime())) {
				return null
			}
			return parsedDate
		}

		const parseYear = (value?: string | null) => {
			const normalized = normalize(value)
			if (!normalized) {
				return null
			}
			const parsed = Number(normalized)
			if (!Number.isInteger(parsed)) {
				return null
			}
			return parsed
		}

		const parseCost = (value?: string | null) => {
			const normalized = normalize(value)
			if (!normalized) {
				return null
			}
			const sanitized = normalized.replace(/\./g, "").replace(",", ".")
			const parsed = Number(sanitized)
			if (!Number.isFinite(parsed)) {
				return null
			}
			return parsed.toFixed(2)
		}

		const errors: string[] = []
		let insertedCount = 0

		for (const [index, row] of parsed.rows.entries()) {
			const lineNumber = index + 2
			const statusValue = normalize(row.status)
			const typeValue = normalize(row.type)
			const locationValue = normalize(row.location)
			const billedToValue = normalize(row.billedto)
			const costToValue = normalize(row.costto)
			const userValue = normalize(row.user)
			const makeModelValue = normalize(row["make-model"])
			const deviceName = normalize(row.name)

			const mappedRow = {
				...row,
				status: statusValue ? statusMap.get(statusValue) ?? null : null,
				type: typeValue ? deviceTypeMap.get(typeValue) ?? null : null,
				location: locationValue
					? locationMap.get(locationValue) ?? null
					: null,
				billedto: billedToValue
					? billedToMap.get(billedToValue) ?? null
					: null,
				costto: costToValue
					? costToMap.get(costToValue) ?? null
					: null,
				user: userValue ? userMap.get(userValue) ?? null : null,
				"make-model": makeModelValue
					? makeModelMap.get(makeModelValue) ?? null
					: null,
			}

			console.log("Import row", lineNumber, mappedRow)

			if (!deviceName) {
				errors.push(
					`Line ${lineNumber} - Device "${deviceName || "Unnamed"}": Name is required.`
				)
				continue
			}

			if (!mappedRow.type) {
				errors.push(
					`Line ${lineNumber} - Device "${deviceName}": Device type not matched.`
				)
				continue
			}

			const mappedDeviceTypeId = mappedRow.type as number

			try {
				await db.transaction(async (tx) => {
					const [newDevice] = await tx
						.insert(device)
						.values({
							name: deviceName,
							deviceTypeId: mappedDeviceTypeId,
							locationId: mappedRow.location,
							statusId: mappedRow.status,
							makeModelId: mappedRow["make-model"],
							serialNumber: normalize(row.serialnumber) || null,
							productNumber: normalize(row.productnumber) || null,
							macAddress: normalize(row.macaddress) || null,
							warrantyStart: parseDate(row.warrantystart),
							warrantyEnd: parseDate(row.warrantyend),
							warrantyType: normalize(row.warrantytype) || null,
							warrantyLink: normalize(row.warrantylink) || null,
							cost: parseCost(row.cost),
							supportSite: normalize(row.supportsite) || null,
							driversSite: normalize(row.driverslink) || null,
							description: null,
						})
						.$returningId()

					const insertedDeviceId = newDevice.id

					if (normalize(row.os)) {
						await tx.insert(deviceComputer).values({
							deviceId: insertedDeviceId,
							os: normalize(row.os),
							domain: normalize(row.domain) || null,
							config: null,
						})
					}

					const lifecyclePayload = {
						purchaseDate: parseDate(row.purchasedate),
						endOfLife: parseDate(row.endoflife),
						expectedReplacementYear: parseYear(row.expectedreplacementyear),
						planDescription: normalize(row.plandescription) || null,
						extraNotes: normalize(row.extranotes) || null,
						billedTo: mappedRow.billedto,
						costTo: mappedRow.costto,
					}

					const hasLifecycleData = Boolean(
						lifecyclePayload.purchaseDate ||
						lifecyclePayload.endOfLife ||
						lifecyclePayload.expectedReplacementYear ||
						lifecyclePayload.planDescription ||
						lifecyclePayload.extraNotes ||
						lifecyclePayload.billedTo ||
						lifecyclePayload.costTo
					)

					if (hasLifecycleData) {
						await tx.insert(deviceLifecycle).values({
							deviceId: insertedDeviceId,
							...lifecyclePayload,
						})
					}
				})

				insertedCount += 1
			} catch (insertError) {
				console.error("Failed to insert device:", insertError)
				errors.push(
					`Line ${lineNumber} - Device "${deviceName}": Failed to insert record.`
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
