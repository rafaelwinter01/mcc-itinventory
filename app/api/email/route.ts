import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT ?? "587")
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM
const smtpSecure = process.env.SMTP_SECURE === "true"

export async function POST(req: Request) {
	try {
		const body = await req.json()
		const email = typeof body?.email === "string" ? body.email.trim() : ""

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 })
		}

		if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
			return NextResponse.json(
				{ error: "SMTP settings are not configured" },
				{ status: 500 }
			)
		}

		const transporter = nodemailer.createTransport({
			host: smtpHost,
			port: smtpPort,
			secure: smtpSecure,
			auth: {
				user: smtpUser,
				pass: smtpPass,
			},
		})

		await transporter.sendMail({
			from: smtpFrom,
			to: email,
			subject: "Hello",
			text: "This is a test",
		})

		return NextResponse.json({ ok: true })
	} catch (error) {
		console.error("Failed to send email:", error)
		return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
	}
}