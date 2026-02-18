import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { history, license } from "@/db/schema"
import { eq } from "drizzle-orm"

type RouteParams = {
	params: Promise<{
		id: string
	}>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id: idParam } = await params
		const id = Number(idParam)

		if (!id) {
			return NextResponse.json({ error: "Invalid license id" }, { status: 400 })
		}

		const [row] = await db.select().from(license).where(eq(license.id, id))

		if (!row) {
			return NextResponse.json({ error: "License not found" }, { status: 404 })
		}

		return NextResponse.json(row, { status: 200 })
	} catch (error) {
		console.error("Error fetching license:", error)
		return NextResponse.json({ error: "Failed to fetch license" }, { status: 500 })
	}
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		const { id: idParam } = await params
		const id = Number(idParam)

		if (!id) {
			return NextResponse.json({ error: "Invalid license id" }, { status: 400 })
		}

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

		await db
			.update(license)
			.set({
				name,
				description: description || null,
				billingFrequency: billingFrequency || null,
				cost,
			})
			.where(eq(license.id, id))

		await db.insert(history).values({
			userId: null,
			action: "UPDATE",
			entityName: "license",
			description: `Updated license: ${name} (ID: ${id})`,
		})

		return NextResponse.json({ message: "License updated successfully" }, { status: 200 })
	} catch (error) {
		console.error("Error updating license:", error)
		return NextResponse.json({ error: "Failed to update license" }, { status: 500 })
	}
}
