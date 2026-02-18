"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import workstationConstants from "@/constants/workstation.json"

type AttributeItem = {
	id: string
	key: string
	value: string
}

type UserOption = {
	id: number
	firstname: string
	lastname: string
	departmentName?: string | null
}

type AssignedUser = {
	userId: number
	name: string
	department?: string | null
	assignedAt: string
}

type DeviceOption = {
	id: number
	name: string
	type?: { name?: string | null } | null
	makeModel?: { make?: string | null; model?: string | null } | null
}

type AssignedDevice = {
	deviceId: number
	name: string
	type?: string | null
	makeModel?: string | null
}

type PeripheralOption = {
	id: number
	name: string
}

type AssignedPeripheral = {
	peripheralId: number
	name: string
	quantity: number
}

type WorkstationResponse = {
	id: number
	name: string | null
	description: string | null
	info?: Record<string, string> | null
	users?: Array<{
		userId: number
		name: string
		department?: string | null
		assignedAt: string
	}>
	devices?: Array<{
		deviceId: number
		name: string
		type?: string | null
		makeModel?: string | null
	}>
	peripherals?: Array<{
		peripheralId: number
		name: string
		quantity?: number | null
	}>
}

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().min(1, "Description is required"),
})

type FormValues = z.infer<typeof formSchema>

type WorkstationFormProps = {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onSuccess?: () => void
	workstationId?: number | null
}

const createAttribute = (key = "", value = ""): AttributeItem => ({
	id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
	key,
	value,
})

export function WorkstationForm({
	open: controlledOpen,
	onOpenChange,
	onSuccess,
	workstationId,
}: WorkstationFormProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [loadingLists, setLoadingLists] = useState(false)
	const [users, setUsers] = useState<UserOption[]>([])
	const [devices, setDevices] = useState<DeviceOption[]>([])
	const [peripherals, setPeripherals] = useState<PeripheralOption[]>([])
	const [attributes, setAttributes] = useState<AttributeItem[]>([createAttribute()])
	const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([])
	const [assignedDevices, setAssignedDevices] = useState<AssignedDevice[]>([])
	const [assignedPeripherals, setAssignedPeripherals] = useState<AssignedPeripheral[]>([])
	const [selectedUserId, setSelectedUserId] = useState<string>("")
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
	const [selectedPeripheralId, setSelectedPeripheralId] = useState<string>("")
	const [peripheralQuantity, setPeripheralQuantity] = useState<string>("1")

	const open = controlledOpen !== undefined ? controlledOpen : internalOpen
	const setOpen = onOpenChange || setInternalOpen

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
		},
	})

	const attributeOptions = useMemo(() => workstationConstants.wkAttributes ?? [], [])

	const fetchLists = useCallback(async () => {
		setLoadingLists(true)
		try {
			const [usersResponse, devicesResponse, peripheralsResponse] = await Promise.all([
				fetch("/api/user"),
				fetch("/api/device?limit=1000&offset=0"),
				fetch("/api/peripheral"),
			])

			if (usersResponse.ok) {
				const usersData = await usersResponse.json()
				setUsers(usersData)
			} else {
				toast.error("Failed to load users")
			}

			if (devicesResponse.ok) {
				const devicesData = await devicesResponse.json()
				setDevices(devicesData.data ?? [])
			} else {
				toast.error("Failed to load devices")
			}

			if (peripheralsResponse.ok) {
				const peripheralsData = await peripheralsResponse.json()
				setPeripherals(peripheralsData)
			} else {
				toast.error("Failed to load peripherals")
			}
		} catch (error) {
			console.error("Error fetching workstation lists:", error)
			toast.error("An error occurred while loading lists")
		} finally {
			setLoadingLists(false)
		}
	}, [])

	const resetFormState = useCallback(() => {
		form.reset({ name: "", description: "" })
		setAttributes([createAttribute()])
		setAssignedUsers([])
		setAssignedDevices([])
		setAssignedPeripherals([])
		setSelectedUserId("")
		setSelectedDeviceId("")
		setSelectedPeripheralId("")
		setPeripheralQuantity("1")
	}, [form])

	const fetchWorkstation = useCallback(async () => {
		if (!workstationId) return
		try {
			const response = await fetch(`/api/workstation/${workstationId}`)
			if (!response.ok) {
				toast.error("Failed to load workstation details")
				return
			}
			const data: WorkstationResponse = await response.json()

			form.reset({
				name: data.name ?? "",
				description: data.description ?? "",
			})

			const infoEntries = data.info ? Object.entries(data.info) : []
			setAttributes(
				infoEntries.length > 0
					? infoEntries.map(([key, value]) => createAttribute(key, String(value)))
					: [createAttribute()]
			)

			setAssignedUsers(
				(data.users ?? []).map((item) => ({
					userId: item.userId,
					name: item.name,
					department: item.department ?? null,
					assignedAt: item.assignedAt,
				}))
			)

			setAssignedDevices(
				(data.devices ?? []).map((item) => ({
					deviceId: item.deviceId,
					name: item.name,
					type: item.type ?? null,
					makeModel: item.makeModel ?? null,
				}))
			)

			setAssignedPeripherals(
				(data.peripherals ?? []).map((item) => ({
					peripheralId: item.peripheralId,
					name: item.name,
					quantity: item.quantity ?? 1,
				}))
			)
		} catch (error) {
			console.error("Error fetching workstation:", error)
			toast.error("An error occurred while loading workstation")
		}
	}, [form, workstationId])

	useEffect(() => {
		if (open) {
			fetchLists()
			if (workstationId) {
				fetchWorkstation()
			} else {
				resetFormState()
			}
		}
	}, [open, fetchLists, fetchWorkstation, resetFormState, workstationId])

	const handleAttributeChange = (id: string, field: "key" | "value", value: string) => {
		setAttributes((prev) =>
			prev.map((attr) => (attr.id === id ? { ...attr, [field]: value } : attr))
		)
	}

	const handleAddAttribute = () => {
		setAttributes((prev) => [...prev, createAttribute()])
	}

	const handleRemoveAttribute = (id: string) => {
		setAttributes((prev) => {
			const next = prev.filter((attr) => attr.id !== id)
			return next.length > 0 ? next : [createAttribute()]
		})
	}

	const handleAddUser = () => {
		if (!selectedUserId) return
		const user = users.find((item) => String(item.id) === selectedUserId)
		if (!user) return

		const alreadyAssigned = assignedUsers.some((item) => item.userId === user.id)
		if (alreadyAssigned) {
			toast.info("User already assigned")
			return
		}

		setAssignedUsers((prev) => [
			...prev,
			{
				userId: user.id,
				name: `${user.firstname} ${user.lastname}`.trim(),
				department: user.departmentName ?? null,
				assignedAt: new Date().toISOString(),
			},
		])
		setSelectedUserId("")
	}

	const handleRemoveUser = (userId: number) => {
		setAssignedUsers((prev) => prev.filter((item) => item.userId !== userId))
	}

	const handleAddDevice = () => {
		if (!selectedDeviceId) return
		const device = devices.find((item) => String(item.id) === selectedDeviceId)
		if (!device) return

		const alreadyAssigned = assignedDevices.some((item) => item.deviceId === device.id)
		if (alreadyAssigned) {
			toast.info("Device already assigned")
			return
		}

		const typeName = device.type?.name ?? null
		const makeModelLabel = device.makeModel
			? [device.makeModel.make, device.makeModel.model].filter(Boolean).join(" ")
			: null

		setAssignedDevices((prev) => [
			...prev,
			{
				deviceId: device.id,
				name: device.name,
				type: typeName,
				makeModel: makeModelLabel,
			},
		])
		setSelectedDeviceId("")
	}

	const handleRemoveDevice = (deviceId: number) => {
		setAssignedDevices((prev) => prev.filter((item) => item.deviceId !== deviceId))
	}

	const handleAddPeripheral = () => {
		if (!selectedPeripheralId) return
		const peripheral = peripherals.find((item) => String(item.id) === selectedPeripheralId)
		if (!peripheral) return

		const quantity = Number(peripheralQuantity) || 1
		const existing = assignedPeripherals.find(
			(item) => item.peripheralId === peripheral.id
		)

		if (existing) {
			setAssignedPeripherals((prev) =>
				prev.map((item) =>
					item.peripheralId === peripheral.id
						? { ...item, quantity: item.quantity + quantity }
						: item
				)
			)
		} else {
			setAssignedPeripherals((prev) => [
				...prev,
				{
					peripheralId: peripheral.id,
					name: peripheral.name,
					quantity,
				},
			])
		}

		setSelectedPeripheralId("")
		setPeripheralQuantity("1")
	}

	const handleRemovePeripheral = (peripheralId: number) => {
		setAssignedPeripherals((prev) => prev.filter((item) => item.peripheralId !== peripheralId))
	}

	const onSubmit = async (values: FormValues) => {
		setLoading(true)
		try {
			const info = attributes.reduce<Record<string, string>>((acc, item) => {
				if (item.key.trim()) {
					acc[item.key.trim()] = item.value
				}
				return acc
			}, {})

			const payload = {
				id: workstationId ?? undefined,
				name: values.name,
				description: values.description,
				info,
				users: assignedUsers.map((item) => ({
					userId: item.userId,
					assignedAt: item.assignedAt,
				})),
				devices: assignedDevices.map((item) => ({ deviceId: item.deviceId })),
				peripherals: assignedPeripherals.map((item) => ({
					peripheralId: item.peripheralId,
					quantity: item.quantity,
				})),
			}

			const response = await fetch("/api/workstation", {
				method: workstationId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			})

			const data = await response.json().catch(() => ({}))

			if (!response.ok) {
				toast.error(data?.error || "Failed to save workstation")
				return
			}

			toast.success(workstationId ? "Workstation updated" : "Workstation created")
			setOpen(false)
			onSuccess?.()
		} catch (error) {
			console.error("Error saving workstation:", error)
			toast.error("An error occurred while saving the workstation")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>{workstationId ? "Edit Workstation" : "Create Workstation"}</DialogTitle>
					<DialogDescription>
						Manage workstation details, attributes, assigned users, devices and peripherals.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[75vh] pr-4">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input placeholder="Workstation name" {...field} />
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
											<Textarea placeholder="Describe this workstation" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="text-sm font-medium">Attributes</div>
									<Button type="button" variant="outline" size="sm" onClick={handleAddAttribute}>
										<Plus className="mr-2 h-4 w-4" />
										Add Attribute
									</Button>
								</div>

								<div className="space-y-2">
									<datalist id="workstation-attribute-options">
										{attributeOptions.map((option) => (
											<option key={option} value={option} />
										))}
									</datalist>

									{attributes.map((attr) => (
										<div key={attr.id} className="grid gap-2 md:grid-cols-[1.2fr_1.6fr_auto]">
											<div>
												<FormLabel className="text-xs">Attribute</FormLabel>
												<Input
													list="workstation-attribute-options"
													placeholder="Select or type"
													value={attr.key}
													onChange={(event) => handleAttributeChange(attr.id, "key", event.target.value)}
												/>
											</div>
											<div>
												<FormLabel className="text-xs">Value</FormLabel>
												<Input
													placeholder="Value"
													value={attr.value}
													onChange={(event) =>
														handleAttributeChange(attr.id, "value", event.target.value)
													}
												/>
											</div>
											<div className="flex items-end">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => handleRemoveAttribute(attr.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<div className="text-sm font-medium">Users</div>
								<div className="grid gap-2 md:grid-cols-[1fr_auto]">
									<Select value={selectedUserId} onValueChange={setSelectedUserId}>
										<SelectTrigger>
											<SelectValue placeholder={loadingLists ? "Loading users..." : "Select a user"} />
										</SelectTrigger>
										<SelectContent>
											{users.map((item) => (
												<SelectItem key={item.id} value={String(item.id)}>
													{item.firstname} {item.lastname}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button type="button" onClick={handleAddUser} disabled={!selectedUserId}>
										Add User
									</Button>
								</div>

								<div className="rounded-md border">
									<div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
										<span>Name</span>
										<span>Department</span>
										<span>Assigned date</span>
										<span></span>
									</div>
									<div className="divide-y">
										{assignedUsers.length === 0 ? (
											<div className="px-3 py-4 text-sm text-muted-foreground">No users assigned.</div>
										) : (
											assignedUsers.map((item) => (
												<div key={item.userId} className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 px-3 py-2">
													<span className="text-sm font-medium">{item.name}</span>
													<span className="text-sm text-muted-foreground">
														{item.department ?? "-"}
													</span>
													<span className="text-sm text-muted-foreground">
														{new Date(item.assignedAt).toLocaleDateString()}
													</span>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => handleRemoveUser(item.userId)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))
										)}
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<div className="text-sm font-medium">Devices</div>
								<div className="grid gap-2 md:grid-cols-[1fr_auto]">
									<Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
										<SelectTrigger>
											<SelectValue placeholder={loadingLists ? "Loading devices..." : "Select a device"} />
										</SelectTrigger>
										<SelectContent>
											{devices.map((item) => (
												<SelectItem key={item.id} value={String(item.id)}>
													{item.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button type="button" onClick={handleAddDevice} disabled={!selectedDeviceId}>
										Add Device
									</Button>
								</div>

								<div className="rounded-md border">
									<div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
										<span>Name</span>
										<span>Type</span>
										<span>Make/Model</span>
										<span></span>
									</div>
									<div className="divide-y">
										{assignedDevices.length === 0 ? (
											<div className="px-3 py-4 text-sm text-muted-foreground">No devices assigned.</div>
										) : (
											assignedDevices.map((item) => (
												<div key={item.deviceId} className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 px-3 py-2">
													<span className="text-sm font-medium">{item.name}</span>
													<span className="text-sm text-muted-foreground">{item.type ?? "-"}</span>
													<span className="text-sm text-muted-foreground">{item.makeModel ?? "-"}</span>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => handleRemoveDevice(item.deviceId)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))
										)}
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<div className="text-sm font-medium">Peripherals</div>
								<div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
									<Select value={selectedPeripheralId} onValueChange={setSelectedPeripheralId}>
										<SelectTrigger>
											<SelectValue
												placeholder={loadingLists ? "Loading peripherals..." : "Select a peripheral"}
											/>
										</SelectTrigger>
										<SelectContent>
											{peripherals.map((item) => (
												<SelectItem key={item.id} value={String(item.id)}>
													{item.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Input
										type="number"
										min={1}
										value={peripheralQuantity}
										onChange={(event) => setPeripheralQuantity(event.target.value)}
										placeholder="Qty"
									/>
									<Button type="button" onClick={handleAddPeripheral} disabled={!selectedPeripheralId}>
										Add Peripheral
									</Button>
								</div>

								<div className="rounded-md border">
									<div className="grid grid-cols-[1.6fr_0.6fr_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
										<span>Name</span>
										<span>Qty</span>
										<span></span>
									</div>
									<div className="divide-y">
										{assignedPeripherals.length === 0 ? (
											<div className="px-3 py-4 text-sm text-muted-foreground">
												No peripherals assigned.
											</div>
										) : (
											assignedPeripherals.map((item) => (
												<div key={item.peripheralId} className="grid grid-cols-[1.6fr_0.6fr_auto] gap-2 px-3 py-2">
													<span className="text-sm font-medium">{item.name}</span>
													<span className="text-sm text-muted-foreground">{item.quantity}</span>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => handleRemovePeripheral(item.peripheralId)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))
										)}
									</div>
								</div>
							</div>

							<div className="flex justify-end">
								<Button type="submit" disabled={loading}>
									{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{workstationId ? "Update Workstation" : "Save Workstation"}
								</Button>
							</div>
						</form>
					</Form>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}
