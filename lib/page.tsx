"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Plus, Trash2, Loader2, Monitor, Info, ShieldCheck, Cpu } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeviceTypeForm } from "@/modals/DeviceType-form"
import { MakeModelForm } from "@/modals/MakeModel-form"
import { LocationForm } from "@/modals/Location-form"
import { StatusForm } from "@/modals/Status-form"

const deviceFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  deviceTypeId: z.string().min(1, "Please select a device type"),
  locationId: z.string().optional(),
  statusId: z.string().optional(),
  makeModelId: z.string().optional(),
  serialNumber: z.string().optional(),
  productNumber: z.string().optional(),
  macAddress: z.string().optional(),
  warrantyStart: z.string().optional(),
  warrantyEnd: z.string().optional(),
  warrantyType: z.string().optional(),
  cost: z.string().optional(),
  supportSite: z.string().optional(),
  driversSite: z.string().optional(),
  description: z.string().optional(),
  // Attributes
  attributes: z.array(z.object({
    key: z.string().min(1, "Key is required"),
    value: z.string().min(1, "Value is required"),
  })).optional(),
  // Computer details
  isComputer: z.boolean(),
  computer: z.object({
    os: z.string().optional(),
    domain: z.string().optional(),
    config: z.string().optional(), // We'll parse this as JSON or just text
  }).optional(),
})

type DeviceFormValues = z.infer<typeof deviceFormSchema>

export default function NewDevicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState<{ id: number, name: string }[]>([])
  const [statuses, setStatuses] = useState<{ id: number, name: string }[]>([])
  const [locations, setLocations] = useState<{ id: number, name: string }[]>([])
  const [models, setModels] = useState<{ id: number, make: string, model: string }[]>([])

  // Modal states
  const [deviceTypeModal, setDeviceTypeModal] = useState(false)
  const [modelModal, setModelModal] = useState(false)
  const [locationModal, setLocationModal] = useState(false)
  const [statusModal, setStatusModal] = useState(false)

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      name: "",
      attributes: [],
      isComputer: false,
      computer: {
        os: "",
        domain: "",
        config: "",
      }
    },
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

  useEffect(() => {
    async function fetchData() {
      try {
        await Promise.all([
          fetchTypes(),
          fetchStatuses(),
          fetchLocations(),
          fetchModels(),
        ])
      } catch (error) {
        console.error("Error loading auxiliary data:", error)
        toast.error("Error loading options")
      }
    }
    fetchData()
  }, [])

  async function onSubmit(data: DeviceFormValues) {
    setLoading(true)
    try {
      const payload = {
        ...data,
        computer: data.isComputer ? data.computer : undefined,
      }

      const response = await fetch("/api/device", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Error creating device")
      }

      toast.success("Device created successfully!")
      router.push("/device")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">New Device</h2>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="warranty">Warranty & Costs</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="technical">Technical Specs</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Main identification data for the asset.</CardDescription>
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
                                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
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
                                <SelectItem key={m.id} value={m.id.toString()}>{m.make} - {m.model}</SelectItem>
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
                    name="statusId"
                    render={({ field }) => (
                      <FormItem>
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
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
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
                                <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
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
                        <FormLabel>Notes</FormLabel>
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
                <CardContent className="grid gap-6 md:grid-cols-2">
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
                  <CardDescription>Add specific fields for this device (Ex: RAM, Processor, etc).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 border p-4 rounded-lg bg-muted/30">
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
                        className="text-destructive h-10 w-10"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
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
                      <div className="flex items-center space-x-2 border p-4 rounded-lg">
                        <input
                          type="checkbox"
                          id="isComputer"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="isComputer"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Device"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <DeviceTypeForm 
        open={deviceTypeModal} 
        onOpenChange={setDeviceTypeModal} 
        onSuccess={fetchTypes} 
      />
      <MakeModelForm 
        open={modelModal} 
        onOpenChange={setModelModal} 
        onSuccess={fetchModels} 
      />
      <LocationForm 
        open={locationModal} 
        onOpenChange={setLocationModal} 
        onSuccess={fetchLocations} 
      />
      <StatusForm 
        open={statusModal} 
        onOpenChange={setStatusModal} 
        onSuccess={fetchStatuses} 
      />
    </div>
  )
}
