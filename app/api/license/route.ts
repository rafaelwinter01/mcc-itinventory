import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { history, license } from "@/db/schema"
import { like, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const nameParam = searchParams.get("name")?.trim().toLowerCase()

		const rows = await db
			.select()
			.from(license)
			.where(
				nameParam
					? like(sql`LOWER(${license.name})`, `%${nameParam}%`)
					: undefined
			)
		return NextResponse.json(rows, { status: 200 })
	} catch (error) {
		console.error("Error fetching licenses:", error)
		return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		const name = typeof body.name === "string" ? body.name.trim() : ""
		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 })
		}

		const description = typeof body.description === "string" ? body.description.trim() : null
		const billingFrequency =
			typeof body.billingFrequency === "string" ? body.billingFrequency.trim() : null
		const cost = body.cost !== undefined && body.cost !== null && body.cost !== ""
			? String(body.cost)
			: null

		const [result] = await db
			.insert(license)
			.values({
				name,
				description: description || null,
				billingFrequency: billingFrequency || null,
				cost,
			})
			.$returningId()

		await db.insert(history).values({
			userId: null,
			action: "CREATE",
			entityName: "license",
			description: `Created license: ${name}`,
		})

		return NextResponse.json({ id: result.id }, { status: 201 })
	} catch (error) {
		console.error("Error creating license:", error)
		return NextResponse.json({ error: "Failed to create license" }, { status: 500 })
	}
}
