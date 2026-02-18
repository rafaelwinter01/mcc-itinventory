"use client"

import * as React from "react"

import { Download, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchItemForm } from "@/modals/SearchItem-form"

type ImportStep = {
	value: string
	label: string
	description: string
}

type NamedOption = {
	id: number
	name: string
}

type ValueOption = {
	id: number
	value: string
}

type ValidationMaps = {
	user: Record<string, ValueOption[] | null>
	license: Record<string, NamedOption[] | null>
}

type ValidationPayload = {
	count: number
	maps: ValidationMaps
	found?: {
		licenseCounts?: Record<string, number>
	}
}

type SearchFieldType = "user" | "license"

type SearchOptionItem = {
	id: number
	label: string
}

const steps: ImportStep[] = [
	{
		value: "download",
		label: "Download Template",
		description: "Get the CSV template that matches the required columns.",
	},
	{
		value: "choose",
		label: "Choose a File",
		description: "Select the CSV file you want to import.",
	},
	{
		value: "validation",
		label: "Validation",
		description: "Select the option that best matches each field.",
	},
	{
		value: "import",
		label: "Import",
		description: "Run the import and validate the data.",
	},
	{
		value: "done",
		label: "Done",
		description: "Review the results and finalize the process.",
	},
]

const ALWAYS_ENABLED_COUNT = 2

export default function UserLicenseImportPage() {
	const [activeStep, setActiveStep] = React.useState(0)
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
	const [isUploading, setIsUploading] = React.useState(false)
	const [uploadErrors, setUploadErrors] = React.useState<string[]>([])
	const [validationPayload, setValidationPayload] =
		React.useState<unknown>(null)
	const [canProceedFromChoose, setCanProceedFromChoose] =
		React.useState(false)
	const [validationSelections, setValidationSelections] = React.useState<
		Record<string, string>
	>({})
	const [addedOptions, setAddedOptions] = React.useState<
		Record<string, SearchOptionItem>
	>({})
	const [searchModalOpen, setSearchModalOpen] = React.useState(false)
	const [searchModalKey, setSearchModalKey] = React.useState<string | null>(
		null
	)
	const [searchModalType, setSearchModalType] =
		React.useState<SearchFieldType>("user")
	const [isProcessing, setIsProcessing] = React.useState(false)
	const [processMessage, setProcessMessage] = React.useState<string | null>(
		null
	)
	const [hasProcessed, setHasProcessed] = React.useState(false)
	const [processStatusCode, setProcessStatusCode] = React.useState<number | null>(
		null
	)
	const [processCondition, setProcessCondition] = React.useState<string | null>(
		null
	)
	const [processErrors, setProcessErrors] = React.useState<string[]>([])

	const isStepEnabled = React.useCallback(
		(index: number) => index < ALWAYS_ENABLED_COUNT || index <= activeStep,
		[activeStep]
	)

	const handleTabChange = React.useCallback(
		(value: string) => {
			const nextIndex = steps.findIndex((step) => step.value === value)
			if (nextIndex === -1) {
				return
			}

			if (isStepEnabled(nextIndex)) {
				setActiveStep(nextIndex)
			}
		},
		[isStepEnabled]
	)

	const goToNext = React.useCallback(() => {
		setActiveStep((current) => Math.min(current + 1, steps.length - 1))
	}, [])

	const handleFileChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0] ?? null
			setSelectedFile(file)
			setUploadErrors([])
			setValidationPayload(null)
			setCanProceedFromChoose(false)
		},
		[]
	)

	const handleUpload = React.useCallback(async () => {
		if (!selectedFile) {
			setUploadErrors(["Please select a CSV file before uploading."])
			setCanProceedFromChoose(false)
			return
		}

		setIsUploading(true)
		setUploadErrors([])

		try {
			const formData = new FormData()
			formData.append("file", selectedFile)

			const response = await fetch("/api/user-license/import/upload", {
				method: "POST",
				body: formData,
			})

			const payload = await response.json().catch(() => ({}))

			if (!response.ok) {
				const errors: string[] = []
				if (typeof payload?.error === "string") {
					errors.push(payload.error)
				}
				if (Array.isArray(payload?.errors)) {
					errors.push(...payload.errors.map(String))
				}
				if (payload?.expected && payload?.received) {
					errors.push(
						`Expected headers: ${payload.expected.join(", ")}`
					)
					errors.push(
						`Received headers: ${payload.received.join(", ")}`
					)
				}

				setUploadErrors(
					errors.length > 0
						? errors
						: ["Upload failed. Please check the file and try again."]
				)
				setCanProceedFromChoose(false)
				return
			}

			setValidationPayload(payload)
			setCanProceedFromChoose(true)
		} catch (error) {
			console.error("Upload failed:", error)
			setUploadErrors(["Upload failed. Please try again."])
			setCanProceedFromChoose(false)
		} finally {
			setIsUploading(false)
		}
	}, [selectedFile])

	const currentValue = steps[activeStep]?.value ?? steps[0].value

	const validationMaps = React.useMemo(() => {
		if (!validationPayload || typeof validationPayload !== "object") {
			return null
		}
		if (!("maps" in validationPayload)) {
			return null
		}
		return (validationPayload as ValidationPayload).maps
	}, [validationPayload])

	const importId = React.useMemo(() => {
		if (!validationPayload || typeof validationPayload !== "object") {
			return null
		}
		if (!("importId" in validationPayload)) {
			return null
		}
		return (validationPayload as { importId?: string }).importId ?? null
	}, [validationPayload])

	const licenseCounts = React.useMemo(() => {
		if (!validationPayload || typeof validationPayload !== "object") {
			return null
		}
		if (!("found" in validationPayload)) {
			return null
		}
		return (
			(validationPayload as ValidationPayload).found?.licenseCounts ?? null
		)
	}, [validationPayload])

	React.useEffect(() => {
		if (!validationMaps) {
			setValidationSelections({})
			setAddedOptions({})
			return
		}

		const nextSelections: Record<string, string> = {}
		gridConfigs.forEach((config) => {
			const entries = Object.entries(validationMaps[config.key] ?? {})
			entries.forEach(([csvValue, matches]) => {
				if (Array.isArray(matches) && matches.length > 0) {
					nextSelections[`${config.key}::${csvValue}`] = String(
						matches[0].id
					)
				}
			})
		})

		setValidationSelections(nextSelections)
		setAddedOptions({})
	}, [validationMaps])

	const gridConfigs = React.useMemo(
		() =>
			[
				{ key: "user", title: "User (Email)" },
				{ key: "license", title: "License" },
			] as const,
		[]
	)

	const fieldTypeByKey = React.useMemo(
		() => ({
			user: "user",
			license: "license",
		}) satisfies Record<(typeof gridConfigs)[number]["key"], SearchFieldType>,
		[gridConfigs]
	)

	const requiredSelectionKeys = React.useMemo(() => {
		if (!validationMaps) {
			return [] as string[]
		}

		return gridConfigs.flatMap((config) =>
			Object.keys(validationMaps[config.key] ?? {}).map(
				(csvValue) => `${config.key}::${csvValue}`
			)
		)
	}, [gridConfigs, validationMaps])

	const isValidationComplete = React.useMemo(() => {
		if (!validationMaps) {
			return false
		}
		if (requiredSelectionKeys.length === 0) {
			return true
		}

		return requiredSelectionKeys.every(
			(key) => Boolean(validationSelections[key])
		)
	}, [requiredSelectionKeys, validationSelections, validationMaps])

	const handleOpenSearch = React.useCallback(
		(selectionKey: string, type: SearchFieldType) => {
			setSearchModalKey(selectionKey)
			setSearchModalType(type)
			setSearchModalOpen(true)
		},
		[]
	)

	const handleApplySearchOption = React.useCallback(
		(option: SearchOptionItem | null) => {
			if (!option || !searchModalKey) {
				return
			}
			setAddedOptions((current) => ({
				...current,
				[searchModalKey]: option,
			}))
			setValidationSelections((current) => ({
				...current,
				[searchModalKey]: String(option.id),
			}))
		},
		[searchModalKey]
	)

	React.useEffect(() => {
		if (steps[activeStep]?.value !== "import") {
			return
		}
		setHasProcessed(false)
		setProcessMessage(null)
		setProcessStatusCode(null)
		setProcessCondition(null)
		setProcessErrors([])
	}, [activeStep])

	const handleProcessImport = React.useCallback(async () => {
		if (!importId) {
			setProcessMessage("Missing import identifier. Please upload again.")
			setHasProcessed(true)
			setProcessStatusCode(null)
			setProcessCondition(null)
			setProcessErrors([])
			return
		}
		const groupedSelections = gridConfigs.reduce(
			(acc, config) => {
				const entries = validationMaps
					? Object.keys(validationMaps[config.key] ?? {})
					: []
				acc[config.key] = entries
					.map((csvValue) => {
						const selectionKey = `${config.key}::${csvValue}`
						const selectedId = validationSelections[selectionKey]
						if (!selectedId) {
							return null
						}
						return {
							value: csvValue,
							id: Number(selectedId),
						}
					})
					.filter((item): item is { value: string; id: number } => Boolean(item))
				return acc
			},
			{} as Record<string, Array<{ value: string; id: number }>>
		)
		setIsProcessing(true)
		setProcessMessage(null)
		setHasProcessed(true)
		setProcessStatusCode(null)
		setProcessCondition(null)
		setProcessErrors([])
		try {
			const response = await fetch("/api/user-license/import/process", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					importId,
					selections: groupedSelections,
				}),
			})
			const payload = await response.json().catch(() => ({}))
			setProcessStatusCode(response.status)
			if (typeof payload?.condition === "string") {
				setProcessCondition(payload.condition)
			}
			if (Array.isArray(payload?.errors)) {
				setProcessErrors(payload.errors.map(String))
			}
			if (!response.ok) {
				const message =
					(typeof payload?.message === "string" && payload.message) ||
					(typeof payload?.error === "string" && payload.error) ||
					"Import failed."
				setProcessMessage(`Error: ${message}`)
				return
			}
			const successMessage =
				(typeof payload?.message === "string" && payload.message) ||
				"Import processed successfully."
			setProcessMessage(`${successMessage}`)
		} catch (error) {
			console.error("Process import failed:", error)
			setProcessMessage("Error: Failed to process import.")
			setProcessStatusCode(null)
			setProcessCondition(null)
			setProcessErrors([])
		} finally {
			setIsProcessing(false)
		}
	}, [importId, validationSelections])

	const normalizedProcessCondition = processCondition?.toLowerCase() ?? null
	const processPanelClassName = hasProcessed
		? normalizedProcessCondition === "error" ||
			(processStatusCode !== null && processStatusCode !== 200)
			? "border-red-300 bg-red-100 text-red-900"
			: normalizedProcessCondition === "partial"
				? "border-amber-300 bg-amber-100 text-amber-900"
				: normalizedProcessCondition === "success"
					? "border-emerald-300 bg-emerald-100 text-emerald-900"
					: "border bg-background text-muted-foreground"
		: ""

	const licenseReport = React.useMemo(() => {
		if (!licenseCounts || !validationMaps) {
			return null
		}

		const result: Record<string, number> = {}
		Object.entries(licenseCounts).forEach(([csvValue, count]) => {
			const selectionKey = `license::${csvValue}`
			const selectedId = validationSelections[selectionKey]
			const mappedOptions = validationMaps.license[csvValue] ?? []
			const addedOption = addedOptions[selectionKey]
			const selectedMatch = selectedId
				? mappedOptions.find((item) => String(item.id) === selectedId)
				: undefined
			const label = selectedMatch?.name ?? addedOption?.label ?? csvValue

			result[label] = (result[label] ?? 0) + count
		})

		return result
	}, [addedOptions, licenseCounts, validationMaps, validationSelections])

	return (
		<section className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight">
					Import User Licenses from File
				</h1>
				<p className="text-muted-foreground">
					Follow the steps to import user licenses from a CSV spreadsheet.
				</p>
			</div>

			<Tabs value={currentValue} onValueChange={handleTabChange}>
				<TabsList className="flex h-auto w-full flex-wrap gap-2 rounded-xl bg-muted p-2">
					{steps.map((step, index) => (
						<TabsTrigger
							key={step.value}
							value={step.value}
							disabled={!isStepEnabled(index)}
							className="min-w-35 flex-1"
						>
							{step.label}
						</TabsTrigger>
					))}
				</TabsList>

				<div className="rounded-2xl border bg-card p-6 shadow-sm">
					<TabsContent value="download" className="space-y-6">
						<div className="space-y-2">
							<h2 className="text-xl font-semibold">Download Template</h2>
							<p className="text-muted-foreground">{steps[0].description}</p>
						</div>
						<div className="flex min-h-65 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-6 text-center">
							<p className="text-sm text-muted-foreground">
								Click below to download the CSV template.
							</p>
							<Button asChild size="lg" className="h-12 px-8 text-base">
								<a href="/api/user-license/import/template" download>
									<Download className="size-5" />
									Download Template
								</a>
							</Button>
						</div>
						<div className="flex justify-end">
							<Button onClick={goToNext}>Next</Button>
						</div>
					</TabsContent>

					<TabsContent value="choose" className="space-y-6">
						<div className="space-y-2">
							<h2 className="text-xl font-semibold">Choose a File</h2>
							<p className="text-muted-foreground">{steps[1].description}</p>
						</div>
						<div className="space-y-4 rounded-xl border border-dashed p-6">
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									Select the CSV file you want to upload.
								</p>
								<Input
									type="file"
									accept=".csv,text/csv"
									onChange={handleFileChange}
								/>
								{selectedFile ? (
									<p className="text-xs text-muted-foreground">
										Selected: {selectedFile.name}
									</p>
								) : null}
							</div>
							<Button
								onClick={handleUpload}
								disabled={isUploading}
								className="h-11"
							>
								<Upload className="size-4" />
								{isUploading ? "Uploading..." : "Upload File"}
							</Button>
						</div>
						{uploadErrors.length > 0 ? (
							<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
								<p className="font-medium">Upload errors</p>
								<ul className="mt-2 list-disc space-y-1 pl-5">
									{uploadErrors.map((error, index) => (
										<li key={`${error}-${index}`}>{error}</li>
									))}
								</ul>
							</div>
						) : null}
						{canProceedFromChoose && validationPayload ? (
							<div className="rounded-xl border border-emerald-300 bg-emerald-100 p-4 text-sm text-emerald-800 font-bold">
								Upload succeeded. Validation data is ready.
							</div>
						) : null}
						<div className="flex justify-end">
							<Button onClick={goToNext} disabled={!canProceedFromChoose}>
								Next
							</Button>
						</div>
					</TabsContent>

					<TabsContent value="validation" className="space-y-6">
						<div className="space-y-2">
							<h2 className="text-xl font-semibold">Validation</h2>
							<p className="text-muted-foreground">{steps[2].description}</p>
						</div>
						{validationMaps ? (
							<div className="grid gap-6 md:grid-cols-2">
								{gridConfigs.map((config) => {
									const entries = Object.entries(
										validationMaps[config.key] ?? {}
									)

									return (
										<div
											key={config.key}
											className="space-y-3 rounded-xl border bg-muted/30 p-4"
										>
											<div className="flex items-center justify-between">
												<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
													{config.title}
												</h3>
												<span className="text-xs text-muted-foreground">
													{entries.length} item(s)
												</span>
											</div>
											<ScrollArea className="h-64 rounded-lg border bg-background">
												<div className="divide-y">
													{entries.length === 0 ? (
														<div className="p-4 text-sm text-muted-foreground">
															No values detected for this field.
														</div>
													) : (
														entries.map(([csvValue, matches]) => {
															const hasMatches = Array.isArray(matches) && matches.length > 0
															const selectionKey = `${config.key}::${csvValue}`
															const options: SearchOptionItem[] = (hasMatches
																? matches.map((item) => ({
																	id: item.id,
																	label: "name" in item ? item.name : item.value,
																}))
																: [])
															const addedOption = addedOptions[selectionKey]
															if (
																addedOption &&
																!options.some((item) => item.id === addedOption.id)
															) {
																options.push(addedOption)
															}

															return (
																<div
																	key={`${config.key}-${csvValue}`}
																	className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
																>
																	<div className="space-y-1">
																		<p className="text-sm font-medium text-foreground">
																			{csvValue}
																		</p>
																	</div>
																	<Select
																		value={validationSelections[selectionKey]}
																		onValueChange={(value: string) =>
																			setValidationSelections((current) => ({
																				...current,
																				[selectionKey]: value,
																			}))
																		}
																	>
																		<SelectTrigger className="w-full">
																			<SelectValue placeholder="Select option" />
																		</SelectTrigger>
																		<SelectContent>
																			{options.length > 0
																				? options.map((item) => (
																						<SelectItem
																							key={`${config.key}-${csvValue}-${item.id}`}
																							value={String(item.id)}
																						>
																							{item.label}
																						</SelectItem>
																					))
																				: (
																					<SelectItem
																						value="none"
																						disabled
																					>
																						No options
																					</SelectItem>
																				)}
																		</SelectContent>
																	</Select>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-9 w-9"
																		onClick={() =>
																		handleOpenSearch(
																			selectionKey,
																			fieldTypeByKey[config.key]
																		)
																	}
																	>
																		<Plus className="size-4" />
																	</Button>
																</div>
															)
														})
													)
												}
											</div>
											</ScrollArea>
										</div>
									)
								})}
							</div>
						) : (
							<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
								Upload a file to view validation details.
							</div>
						)}
						<div className="flex justify-end">
							<Button onClick={goToNext} disabled={!isValidationComplete}>
								Next
							</Button>
						</div>
					</TabsContent>

					<TabsContent value="import" className="space-y-6">
						<div className="space-y-2">
							<h2 className="text-xl font-semibold">
								The following user licenses will be processed.
							</h2>
							<p className="text-muted-foreground">
								Review the totals before starting the process.
							</p>
						</div>
						<div className="rounded-xl border border-dashed p-6">
							<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
								License totals
							</h3>
							<div className="mt-4">
								{licenseReport ? (
									<div className="overflow-hidden rounded-lg border">
										<div className="grid grid-cols-[1fr_auto] gap-2 bg-muted px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
											<span>License</span>
											<span>Count</span>
										</div>
										<div className="divide-y">
											{Object.entries(licenseReport).length === 0 ? (
												<div className="px-4 py-3 text-sm text-muted-foreground">
													No licenses found.
												</div>
											) : (
												Object.entries(licenseReport).map(
													([label, count]) => (
														<div
															key={label}
															className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 text-sm"
														>
															<span className="text-foreground">
																{label}
															</span>
															<span className="font-medium text-foreground">
																{count}
															</span>
														</div>
													)
												)
											)}
										</div>
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										Upload a file and complete validation to see the report.
									</p>
								)}
							</div>
						</div>
						<div className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-sm text-muted-foreground">
									Ready to process the import.
								</p>
								<Button
									onClick={handleProcessImport}
									disabled={!importId || isProcessing}
								>
									{isProcessing ? "Processing..." : "Process Import"}
								</Button>
							</div>
							{hasProcessed ? (
								<div
									className={`rounded-lg border px-4 py-3 text-sm ${processPanelClassName}`}
								>
									{processMessage ?? "Processing..."}
								</div>
							) : null}
						</div>
						<div className="flex justify-end">
							<Button onClick={goToNext} disabled={processStatusCode !== 200}>
								Next
							</Button>
						</div>
					</TabsContent>

					<TabsContent value="done" className="space-y-6">
						<div className="space-y-2">
							<h2 className="text-xl font-semibold">Done</h2>
							<p className="text-muted-foreground">{steps[4].description}</p>
						</div>
						<div className="rounded-xl border p-6">
							{processErrors.length > 0 ? (
								<div className="space-y-3">
									<p className="text-sm font-medium text-foreground">
										Processing completed with errors:
									</p>
									<ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
										{processErrors.map((error, index) => (
											<li key={`${error}-${index}`}>{error}</li>
										))}
									</ul>
								</div>
							) : (
								<p className="text-sm text-foreground">
									{processMessage ?? "Success. All records were inserted."}
								</p>
							)}
						</div>
					</TabsContent>
				</div>
			</Tabs>
			<SearchItemForm
				fieldType={searchModalType}
				open={searchModalOpen}
				onOpenChange={setSearchModalOpen}
				onApply={handleApplySearchOption}
			/>
		</section>
	)
}
