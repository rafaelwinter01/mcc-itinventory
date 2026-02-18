"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Plus, Trash2, Loader2, Monitor, Info, ShieldCheck, Search, X, CalendarClock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeviceTypeForm } from "@/modals/DeviceType-form"
import { MakeModelForm } from "@/modals/MakeModel-form"
import { LocationForm } from "@/modals/Location-form"
import { DepartmentForm } from "@/modals/Department-form"
import { StatusForm } from "@/modals/Status-form"
import { SearchItemForm } from "@/modals/SearchItem-form"

const deviceFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  deviceTypeId: z.string().min(1, "Please select a device type"),
  locationId: z.string().optional(),
  statusId: z.string().optional(),
  makeModelId: z.string().optional(),
  assignedUserId: z.string().optional(),
  assignedUserName: z.string().optional(),
  serialNumber: z.string().optional(),
  productNumber: z.string().optional(),
  macAddress: z.string().optional(),
  warrantyStart: z.string().optional(),
  warrantyEnd: z.string().optional(),
  warrantyType: z.string().optional(),
  warrantyLink: z.string().optional(),
  cost: z.string().optional(),
  purchaseDate: z.string().optional(),
  endOfLife: z.string().optional(),
  expectedReplacementYear: z.string().optional(),
  planDescription: z.string().optional(),
  extraNotes: z.string().optional(),
  billedTo: z.string().optional(),
  costTo: z.string().optional(),
  supportSite: z.string().optional(),
  driversSite: z.string().optional(),
  description: z.string().optional(),
  attributes: z
    .array(
      z.object({
        key: z.string().min(1, "Key is required"),
        value: z.string().min(1, "Value is required"),
      })
    )
    .optional(),
  isComputer: z.boolean(),
  computer: z
    .object({
      os: z.string().optional(),
      domain: z.string().optional(),
      config: z.string().optional(),
    })
    .optional(),
})

export type DeviceFormValues = z.infer<typeof deviceFormSchema>

type DeviceFormProps = {
  mode: "create" | "edit"
  deviceId?: number
  initialValues?: DeviceFormValues
}

export function DeviceForm({ mode, deviceId, initialValues }: DeviceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState<{ id: number; name: string }[]>([])
  const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([])
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [models, setModels] = useState<{ id: number; make: string; model: string }[]>([])

  const [deviceTypeModal, setDeviceTypeModal] = useState(false)
  const [modelModal, setModelModal] = useState(false)
  const [locationModal, setLocationModal] = useState(false)
  const [departmentModal, setDepartmentModal] = useState(false)
  const [statusModal, setStatusModal] = useState(false)
  const [userSearchModal, setUserSearchModal] = useState(false)

  const defaultValues: DeviceFormValues = initialValues ?? {
    name: "",
    deviceTypeId: "",
    locationId: "",
    statusId: "",
    makeModelId: "",
    assignedUserId: "",
    assignedUserName: "",
    serialNumber: "",
    productNumber: "",
    macAddress: "",
    warrantyStart: "",
    warrantyEnd: "",
    warrantyType: "",
    warrantyLink: "",
    cost: "",
    purchaseDate: "",
    endOfLife: "",
    expectedReplacementYear: "",
    planDescription: "",
    extraNotes: "",
    billedTo: "",
    costTo: "",
    supportSite: "",
    driversSite: "",
    description: "",
    attributes: [],
    isComputer: false,
    computer: {
      os: "",
      domain: "",
      config: "",
    },
  }

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    name: "attributes",
    control: form.control,
  })

  const fetchTypes = async () => {
    try {
      const res = await fetch("/api/devicetype")
      const data = await res.json()
      setTypes(data)
    } catch (error) {
      console.error("Error loading types:", error)
    }
  }

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/status")
      const data = await res.json()
      setStatuses(data)
    } catch (error) {
      console.error("Error loading statuses:", error)
    }
  }

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/location")
      const data = await res.json()
      setLocations(data)
    } catch (error) {
      console.error("Error loading locations:", error)
    }
  }

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/makemodel")
      const data = await res.json()
      setModels(data)
    } catch (error) {
      console.error("Error loading models:", error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/department")
      const data = await res.json()
      setDepartments(data)
    } catch (error) {
      console.error("Error loading departments:", error)
    }
  }

  useEffect(() => {
    const fetchLists = async () => {
      try {
        await Promise.all([fetchTypes(), fetchStatuses(), fetchLocations(), fetchDepartments(), fetchModels()])
      } catch (error) {
        console.error("Error loading auxiliary data:", error)
        toast.error("Error loading options")
      }
    }

    fetchLists()
  }, [])

  async function onSubmit(data: DeviceFormValues) {
    if (mode === "edit" && !deviceId) {
      toast.error("Missing device identifier")
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...data,
        computer: data.isComputer ? data.computer : undefined,
      }

      const endpoint = mode === "create" ? "/api/device" : `/api/device/${deviceId}`
      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Error saving device")
      }

      toast.success(mode === "create" ? "Device created successfully!" : "Device updated successfully!")

      if (mode === "create") {
        router.push("/device")
      } else {
        router.push(`/device/${deviceId}`)
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const pageTitle = mode === "create" ? "New Device" : "Edit Device"
  const submitLabel = mode === "create" ? "Create Device" : "Save Changes"

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{pageTitle}</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:w-150">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="warranty">Warranty & Costs</TabsTrigger>
              <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="technical">Technical Specs</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex gap-2 w-full justify-between items-start">
                    <div className="flex gap-2 items-center">
                    <Info className="h-5 w-5" />
                    Basic Information
                    </div>
                  <div className="flex gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="assignedUserName"
                    render={({ field }) => (
                      <FormItem className="flex flex-col w-[240px]">
                        <FormLabel>Assigned User</FormLabel>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Unassigned"
                              readOnly
                              className="pl-8 cursor-pointer hover:bg-accent/50 pr-8"
                              onClick={() => setUserSearchModal(true)}
                            />
                          </FormControl>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                form.setValue("assignedUserId", "")
                                form.setValue("assignedUserName", "")
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignedUserId"
                    render={({ field }) => (
                      <Input type="hidden" {...field} />
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="statusId"
                    render={({ field }) => (
                      <FormItem className="w-[200px]">
                        <FormLabel>Status</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setStatusModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  </CardTitle>                  
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Finance Notebook 01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deviceTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Type</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {types.map((t) => (
                                <SelectItem key={t.id} value={t.id.toString()}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setDeviceTypeModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="makeModelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make / Model</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {models.map((m) => (
                                <SelectItem key={m.id} value={m.id.toString()}>
                                  {m.make} - {m.model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setModelModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map((l) => (
                                <SelectItem key={l.id} value={l.id.toString()}>
                                  {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setLocationModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="S/N" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="macAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MAC Address</FormLabel>
                        <FormControl>
                          <Input placeholder="00:00:00..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Additional Details / Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warranty" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Warranty & Financial
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="warrantyStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Start</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="warrantyEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty End</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="warrantyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: On-site, Carry-in" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="warrantyLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Cost</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lifecycle" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    Lifecycle
                  </CardTitle>
                  <CardDescription>
                    Track purchase timing, end-of-life, and cost allocation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endOfLife"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End of Life</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedReplacementYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Replacement Year</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2028" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="planDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Replacement plan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billed To</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((l) => (
                                <SelectItem key={l.id} value={l.id.toString()}>
                                  {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setDepartmentModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="costTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost To</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((l) => (
                                <SelectItem key={l.id} value={l.id.toString()}>
                                  {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setDepartmentModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="extraNotes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Extra Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional lifecycle notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attributes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Custom Attributes
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ key: "", value: "" })}
                    >
                      Add Field
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Add specific fields for this device (Ex: RAM, Processor, etc).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 rounded-lg border bg-muted/30 p-4">
                      <div className="grid flex-1 gap-2">
                        <FormField
                          control={form.control}
                          name={`attributes.${index}.key`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: RAM" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid flex-1 gap-2">
                        <FormField
                          control={form.control}
                          name={`attributes.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 16GB" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed py-6 text-center text-muted-foreground">
                      No custom attributes added.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Computer Settings
                  </CardTitle>
                  <CardDescription>Enable to fill specific OS and Domain information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="isComputer"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2 rounded-lg border p-4">
                        <input
                          type="checkbox"
                          id="isComputer"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor="isComputer" className="text-sm font-medium leading-none">
                            This device is a computer/server
                          </label>
                        </div>
                      </div>
                    )}
                  />

                  {form.watch("isComputer") && (
                    <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-top-2">
                      <FormField
                        control={form.control}
                        name="computer.os"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating System</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Windows 11 Enterprise" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="computer.domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain / Workgroup</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: CORP.LOCAL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="computer.config"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Additional Configuration (JSON or Text)</FormLabel>
                            <FormControl>
                              <Textarea placeholder='{"build": "22H2", "key": "ABC-123"}' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </Form>

      <DeviceTypeForm open={deviceTypeModal} onOpenChange={setDeviceTypeModal} onSuccess={fetchTypes} />
      <MakeModelForm open={modelModal} onOpenChange={setModelModal} onSuccess={fetchModels} />
      <LocationForm open={locationModal} onOpenChange={setLocationModal} onSuccess={fetchLocations} />
      <DepartmentForm open={departmentModal} onOpenChange={setDepartmentModal} onSuccess={fetchDepartments} />
      <StatusForm open={statusModal} onOpenChange={setStatusModal} onSuccess={fetchStatuses} />
      <SearchItemForm
        fieldType="user"
        open={userSearchModal}
        onOpenChange={setUserSearchModal}
        onApply={(item) => {
          if (item) {
            form.setValue("assignedUserId", item.id.toString())
            form.setValue("assignedUserName", item.label)
          }
          setUserSearchModal(false)
        }}
      />
    </div>
  )
}
