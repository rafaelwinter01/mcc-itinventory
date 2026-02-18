"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { DeviceTypeForm } from "@/modals/DeviceType-form"
import { DepartmentForm } from "@/modals/Department-form"
import { LocationForm } from "@/modals/Location-form"
import { MakeModelForm } from "@/modals/MakeModel-form"
import { StatusForm } from "@/modals/Status-form"
import { UserForm } from "@/modals/User-form"
import { LicenseForm } from "@/modals/License-form"

type FieldType =
	| "status"
	| "device_type"
	| "location"
	| "department"
	| "user"
	| "make_model"
	| "license"

type OptionItem = {
	id: number
	label: string
}

type SearchItemFormProps = {
	fieldType: FieldType
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onApply?: (item: OptionItem | null) => void
}

const fieldConfig = {
	status: {
		title: "Status",
		description: "Search and select a status.",
		endpoint: "/api/status",
		buildLabel: (item: { id: number; name: string }) => item.name,
	},
	device_type: {
		title: "Device Type",
		description: "Search and select a device type.",
		endpoint: "/api/devicetype",
		buildLabel: (item: { id: number; name: string }) => item.name,
	},
	location: {
		title: "Location",
		description: "Search and select a location.",
		endpoint: "/api/location",
		buildLabel: (item: { id: number; name: string }) => item.name,
	},
	department: {
		title: "Department",
		description: "Search and select a department.",
		endpoint: "/api/department",
		buildLabel: (item: { id: number; name: string }) => item.name,
	},
	user: {
		title: "User",
		description: "Search and select a user.",
		endpoint: "/api/user",
		buildLabel: (item: { id: number; firstname: string; lastname: string }) =>
			`${item.firstname} ${item.lastname}`.trim(),
	},
	make_model: {
		title: "Make & Model",
		description: "Search and select a make/model.",
		endpoint: "/api/makemodel",
		buildLabel: (item: { id: number; make: string; model: string }) =>
			`${item.make} ${item.model}`.trim(),
	},
	license: {
		title: "License",
		description: "Search and select a license.",
		endpoint: "/api/license",
		buildLabel: (item: { id: number; name: string }) => item.name,
	},
} as const

export function SearchItemForm({
	fieldType,
	open: controlledOpen,
	onOpenChange,
	onApply,
}: SearchItemFormProps) {
	const [internalOpen, setInternalOpen] = React.useState(false)
	const [items, setItems] = React.useState<OptionItem[]>([])
	const [loading, setLoading] = React.useState(false)
	const [searchValue, setSearchValue] = React.useState("")
	const [searchQuery, setSearchQuery] = React.useState("")
	const [selectedId, setSelectedId] = React.useState<number | null>(null)
	const [showStatusForm, setShowStatusForm] = React.useState(false)
	const [showDeviceTypeForm, setShowDeviceTypeForm] = React.useState(false)
	const [showLocationForm, setShowLocationForm] = React.useState(false)
	const [showDepartmentForm, setShowDepartmentForm] = React.useState(false)
	const [showUserForm, setShowUserForm] = React.useState(false)
	const [showMakeModelForm, setShowMakeModelForm] = React.useState(false)
	const [showLicenseForm, setShowLicenseForm] = React.useState(false)

	const open = controlledOpen !== undefined ? controlledOpen : internalOpen
	const setOpen = onOpenChange || setInternalOpen
	const config = fieldConfig[fieldType]

	const fetchItems = React.useCallback(async () => {
		setLoading(true)
		try {
			const response = await fetch(config.endpoint)
			if (!response.ok) {
				throw new Error("Failed to load options")
			}
			const data = (await response.json()) as Array<{ id: number }>
			const mapped = data.map((item) => ({
				id: item.id,
				label: config.buildLabel(item as never),
			}))
			setItems(mapped)
		} catch (error) {
			console.error("Failed to load options:", error)
			toast.error("Failed to load options")
		} finally {
			setLoading(false)
		}
	}, [config])

	React.useEffect(() => {
		if (!open) {
			return
		}
		setSearchValue("")
		setSearchQuery("")
		setSelectedId(null)
		fetchItems()
	}, [open, fetchItems, fieldType])

	const filteredItems = React.useMemo(() => {
		const normalized = searchQuery.trim().toLowerCase()
		if (!normalized) {
			return items
		}
		return items.filter((item) =>
			item.label.toLowerCase().includes(normalized)
		)
	}, [items, searchQuery])

	const handleSearch = () => {
		setSearchQuery(searchValue)
	}

	const handleApply = () => {
		const selected = items.find((item) => item.id === selectedId) ?? null
		onApply?.(selected)
		setOpen(false)
	}

	const handleAddNew = () => {
		if (fieldType === "status") {
			setShowStatusForm(true)
			return
		}
		if (fieldType === "device_type") {
			setShowDeviceTypeForm(true)
			return
		}
		if (fieldType === "location") {
			setShowLocationForm(true)
			return
		}
		if (fieldType === "department") {
			setShowDepartmentForm(true)
			return
		}
		if (fieldType === "user") {
			setShowUserForm(true)
			return
		}
		if (fieldType === "license") {
			setShowLicenseForm(true)
			return
		}
		setShowMakeModelForm(true)
	}

	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{config.title}</DialogTitle>
						<DialogDescription>{config.description}</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input
								placeholder="Search..."
								value={searchValue}
								onChange={(event) => setSearchValue(event.target.value)}
								className="flex-1"
							/>
							<Button type="button" onClick={handleSearch}>
								Search
							</Button>
						</div>

						<ScrollArea className="h-72 rounded-lg border">
							<div className="space-y-2 p-2">
								{loading ? (
									<p className="p-4 text-sm text-muted-foreground">
										Loading options...
									</p>
								) : filteredItems.length === 0 ? (
									<p className="p-4 text-sm text-muted-foreground">
										No options found.
									</p>
								) : (
									filteredItems.map((item) => (
										<button
											key={item.id}
											type="button"
											onClick={() => setSelectedId(item.id)}
											className={cn(
												"flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
												selectedId === item.id
													? "border-primary bg-primary/10"
													: "hover:bg-muted"
											)}
										>
											<span className="text-foreground">{item.label}</span>
										</button>
									))
								)}
							</div>
						</ScrollArea>
					</div>

					<DialogFooter className="gap-2 sm:justify-between">
						<Button type="button" variant="outline" onClick={handleAddNew}>
							Add New
						</Button>
						<Button type="button" onClick={handleApply} disabled={!selectedId}>
							Apply
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<StatusForm
				open={showStatusForm}
				onOpenChange={setShowStatusForm}
				onSuccess={() => fetchItems()}
			/>
			<DeviceTypeForm
				open={showDeviceTypeForm}
				onOpenChange={setShowDeviceTypeForm}
				onSuccess={() => fetchItems()}
			/>
			<LocationForm
				open={showLocationForm}
				onOpenChange={setShowLocationForm}
				onSuccess={() => fetchItems()}
			/>
			<DepartmentForm
				open={showDepartmentForm}
				onOpenChange={setShowDepartmentForm}
				onSuccess={() => fetchItems()}
			/>
			<UserForm
				open={showUserForm}
				onOpenChange={setShowUserForm}
				onSuccess={() => fetchItems()}
			/>
			<MakeModelForm
				open={showMakeModelForm}
				onOpenChange={setShowMakeModelForm}
				onSuccess={() => fetchItems()}
			/>
			<LicenseForm
				open={showLicenseForm}
				onOpenChange={setShowLicenseForm}
				onSuccess={() => fetchItems()}
			/>
		</>
	)
}
