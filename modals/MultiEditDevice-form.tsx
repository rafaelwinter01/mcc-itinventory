"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

export type MultiEditOption = {
	label: string
	value: string
}

export type MultiEditColumn = {
	key: string
	label: string
	type?: "text" | "number" | "date"
	isForeignKey?: boolean
	options?: MultiEditOption[]
}

type MultiEditDeviceFormProps = {
	columns: MultiEditColumn[]
	selectedIds: number[]
	optionLoaders?: Record<string, () => Promise<MultiEditOption[]>>
	onCancel?: () => void
	onUpdated?: () => void
}

export function MultiEditDeviceForm({
	columns,
	selectedIds,
	optionLoaders,
	onCancel,
	onUpdated,
}: MultiEditDeviceFormProps) {
	const initialValues = useMemo(() => {
		return columns.reduce<Record<string, string>>((acc, column) => {
			acc[column.key] = ""
			return acc
		}, {})
	}, [columns])

	const [values, setValues] = useState<Record<string, string>>(initialValues)
	const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
		() =>
			columns.reduce<Record<string, boolean>>((acc, column) => {
				acc[column.key] = false
				return acc
			}, {})
	)
	const [loadedOptions, setLoadedOptions] = useState<
		Record<string, MultiEditOption[]>
	>({})
	const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleValueChange = (key: string, value: string) => {
		setValues((prev) => ({ ...prev, [key]: value }))
	}

	const ensureOptionsLoaded = (key: string) => {
		if (!optionLoaders?.[key] || loadedOptions[key] || loadingKeys[key]) return
		setLoadingKeys((prev) => ({ ...prev, [key]: true }))
		optionLoaders[key]()
			.then((options) => {
				setLoadedOptions((prev) => ({ ...prev, [key]: options }))
			})
			.finally(() => {
				setLoadingKeys((prev) => ({ ...prev, [key]: false }))
			})
	}

	const handleToggleField = (key: string, checked: boolean) => {
		setSelectedFields((prev) => ({ ...prev, [key]: checked }))
		if (checked) {
			ensureOptionsLoaded(key)
		}
	}

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const updates = Object.entries(values).reduce<Record<string, string>>(
			(acc, [key, value]) => {
				if (selectedFields[key] && value !== "") {
					acc[key] = value
				}
				return acc
			},
			{}
		)

		if (Object.keys(updates).length === 0 || selectedIds.length === 0) {
			return
		}

		setIsSubmitting(true)

		const payload = {
			ids: selectedIds,
			updates,
		}

		const response = await fetch("/api/device/bulk", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		})

		if (response.ok) {
			onUpdated?.()
		}

		setIsSubmitting(false)
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="rounded-md border p-4">
				<div className="text-sm text-muted-foreground">
					Selected devices: {selectedIds.length}
				</div>
			</div>

			<div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3">
				{columns.map((column) => (
					<div key={column.key} className="grid grid-cols-[1fr_auto] gap-3">
						<div className="space-y-2">
							<Label htmlFor={column.key}>{column.label}</Label>
							{column.isForeignKey ? (
								<Select
									value={values[column.key]}
									onValueChange={(value) => handleValueChange(column.key, value)}
									onOpenChange={(open) => {
										if (open) ensureOptionsLoaded(column.key)
									}}
									disabled={!selectedFields[column.key]}
								>
									<SelectTrigger id={column.key} className="w-full">
										<SelectValue
											placeholder={
												loadingKeys[column.key] ? "Loading..." : "Select"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{(loadedOptions[column.key] ?? column.options ?? []).map(
											(option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											)
										)}
									</SelectContent>
								</Select>
							) : (
								<Input
									id={column.key}
									type={column.type ?? "text"}
									value={values[column.key]}
									onChange={(event) =>
										handleValueChange(column.key, event.target.value)
									}
									disabled={!selectedFields[column.key]}
								/>
							)}
						</div>
						<div className="grid h-full items-end pb-4">
							<Checkbox
								checked={selectedFields[column.key]}
								onCheckedChange={(checked) =>
									handleToggleField(column.key, Boolean(checked))
								}
								aria-label={`Include ${column.label}`}
							/>
						</div>
					</div>
				))}
			</div>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Apply changes"}
				</Button>
			</div>
		</form>
	)
}
