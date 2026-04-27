"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type LicenseRecord = {
	id: number
	name: string
	description: string | null
	cost: string | null
	billingFrequency: string | null
}

const billingFrequencyOptions = [
	"Yearly",
	"Monthly",
	"Daily",
	"Once",
	"Does not apply",
] as const

type BillingFrequency = (typeof billingFrequencyOptions)[number]

function toBillingFrequency(value: string | null): BillingFrequency | "" {
	if (value && billingFrequencyOptions.includes(value as BillingFrequency)) {
		return value as BillingFrequency
	}

	return ""
}

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	cost: z.string().optional(),
	billingFrequency: z.union([z.enum(billingFrequencyOptions), z.literal("")]).optional(),
})

type FormValues = z.infer<typeof formSchema>

type LicenseFormProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
	licenseId?: number | null
}

export function LicenseForm({ open, onOpenChange, onSuccess, licenseId }: LicenseFormProps) {
	const [loading, setLoading] = useState(false)
	const [loadingLicense, setLoadingLicense] = useState(false)

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
			cost: "",
			billingFrequency: "",
		},
	})

	useEffect(() => {
		if (!open) return

		const loadLicense = async () => {
			if (!licenseId) {
				form.reset({
					name: "",
					description: "",
					cost: "",
					billingFrequency: "",
				})
				return
			}

			setLoadingLicense(true)
			try {
				const response = await fetch(`/api/license/${licenseId}`)
				if (!response.ok) {
					toast.error("Failed to load license")
					return
				}
				const data: LicenseRecord = await response.json()
				form.reset({
					name: data.name ?? "",
					description: data.description ?? "",
					cost: data.cost ?? "",
					billingFrequency: toBillingFrequency(data.billingFrequency),
				})
			} catch (error) {
				console.error("Error loading license:", error)
				toast.error("An error occurred while loading license")
			} finally {
				setLoadingLicense(false)
			}
		}

		loadLicense()
	}, [open, licenseId, form])

	const onSubmit = async (values: FormValues) => {
		setLoading(true)
		try {
			const payload = {
				name: values.name.trim(),
				description: values.description?.trim() || null,
				cost: values.cost?.trim() || null,
				billingFrequency: values.billingFrequency?.trim() || null,
			}

			const response = await fetch(licenseId ? `/api/license/${licenseId}` : "/api/license", {
				method: licenseId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			})

			const data = await response.json().catch(() => ({}))

			if (!response.ok) {
				toast.error(data?.error || "Failed to save license")
				return
			}

			toast.success(licenseId ? "License updated" : "License created")
			onOpenChange(false)
			onSuccess?.()
		} catch (error) {
			console.error("Error saving license:", error)
			toast.error("An error occurred while saving the license")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-106.25">
				<DialogHeader>
					<DialogTitle>{licenseId ? "Edit License" : "Add License"}</DialogTitle>
					<DialogDescription>
						{licenseId
							? "Update license details and billing information."
							: "Register a new software license."}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="Microsoft 365" {...field} disabled={loadingLicense} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Describe the license scope"
											{...field}
											value={field.value ?? ""}
											disabled={loadingLicense}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid gap-4 md:grid-cols-2">
							<FormField
								control={form.control}
								name="cost"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Cost</FormLabel>
										<FormControl>
											<Input
												placeholder="0.00"
												inputMode="decimal"
												{...field}
												value={field.value ?? ""}
												disabled={loadingLicense}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="billingFrequency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Billing Frequency</FormLabel>
										<FormControl>
											<Select
												value={field.value ?? ""}
												onValueChange={field.onChange}
												disabled={loadingLicense}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select frequency" className="w-full"/>
												</SelectTrigger>
												<SelectContent>
													{billingFrequencyOptions.map((option) => (
														<SelectItem key={option} value={option}>
															{option}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="flex justify-end pt-4">
							<Button type="submit" disabled={loading || loadingLicense}>
								{(loading || loadingLicense) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{licenseId ? "Update License" : "Save License"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
