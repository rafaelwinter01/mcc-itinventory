"use client"
import { 
  Monitor, 
  MapPin, 
  Tag, 
  Cpu, 
  ShieldCheck, 
  History, 
  FileText, 
  Globe, 
  ArrowLeft,
  Pencil,
  Copy,
  ChevronDown,
  ChevronUp,
  CalendarClock
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type DeviceAttribute = {
  id: number
  key: string
  value: string
}

export type DeviceComputer = {
  id: number
  deviceId: number
  os?: string | null
  domain?: string | null
  config?: unknown
}

export type DeviceAssignedUser = {
  id: number
  name: string
  email?: string | null
}

export type DeviceRelation = {
  id: number
  name?: string | null
  color?: string | null
  address?: string | null
  make?: string | null
  model?: string | null
}

export type DeviceLifecycle = {
  id: number
  deviceId: number
  purchaseDate?: string | Date | null
  endOfLife?: string | Date | null
  expectedReplacementYear?: number | string | null
  planDescription?: string | null
  extraNotes?: string | null
  billedToLocation?: DeviceRelation | null
  costToLocation?: DeviceRelation | null
}

export type DeviceDetailsRecord = {
  id: number
  name: string
  serialNumber?: string | null
  productNumber?: string | null
  macAddress?: string | null
  description?: string | null
  cost?: string | number | null
  supportSite?: string | null
  driversSite?: string | null
  warrantyType?: string | null
  warrantyLink?: string | null
  warrantyStart?: string | Date | null
  warrantyEnd?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  type?: DeviceRelation | null
  status?: DeviceRelation | null
  location?: DeviceRelation | null
  makeModel?: DeviceRelation | null
  attributes?: DeviceAttribute[] | null
  computer?: DeviceComputer | null
  lifecycle?: DeviceLifecycle | null
  assignedUser?: DeviceAssignedUser | null
}

interface DeviceDetailsProps {
  deviceData: DeviceDetailsRecord
  variant?: "default" | "compact"
}

function formatCost(cost: string | number | null | undefined) {
  if (cost === null || cost === undefined || cost === "") return "N/A"
  return String(cost)
}

function DeviceDetailsCompact({ deviceData }: { deviceData: DeviceDetailsRecord }) {
  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A"
    const parsedDate = typeof date === "string" ? new Date(date) : date
    if (Number.isNaN(parsedDate.getTime())) return "N/A"
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(parsedDate)
  }

  return (
    <div className="flex-1 space-y-4 p-6 pt-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <Link href="/device">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs text-muted-foreground">Asset #{deviceData.id}</p>
              <h2 className="text-2xl font-bold tracking-tight">{deviceData.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  <Monitor className="h-3 w-3 mr-1" />{deviceData.type?.name ?? "Uncategorized"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/device/${deviceData.id}/edit`}>
              <Pencil className="h-3 w-3" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/device/new?from=${deviceData.id}`}>
              <Copy className="h-3 w-3" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 rounded-lg border bg-card/80 p-2 shadow-sm">
            <p className="text-[10px] font-medium uppercase text-muted-foreground">Status</p>
            <Badge className={cn("text-xs", deviceData.status?.color || "")} variant="secondary">
              {deviceData.status?.name ?? "No status"}
            </Badge>
          </div>
        </div>        
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between text-lg">
            <div>General Information</div>
            <p className="text-xs text-muted-foreground">Created on {formatDate(deviceData.createdAt ?? "N/A")}</p>
          </CardTitle>
          <CardDescription className="text-xs">Consolidated overview of this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              <p className="text-sm leading-relaxed">{deviceData.description || "No description available."}</p>
            </div>
          </section>
          
          <Separator />
          
          <section className="space-y-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Location / User</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Current location</p>
                    <p className="text-sm font-semibold">{deviceData.location?.name || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{deviceData.location?.address || "No address on file"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Assigned user</p>
                    <p className="text-sm font-semibold">{deviceData.assignedUser?.name || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{deviceData.assignedUser?.email || "No contact on file"}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm font-semibold">Support & Drivers</div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cost</p>
                    <p className="text-sm font-semibold">{formatCost(deviceData.cost)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Support site</p>
                    {deviceData.supportSite ? (
                      <Link href={deviceData.supportSite} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <Globe className="h-3 w-3" /> Open support
                      </Link>
                    ) : (
                      <p className="text-sm">N/A</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Drivers</p>
                    {deviceData.driversSite ? (
                      <Link href={deviceData.driversSite} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <Globe className="h-3 w-3" /> Open drivers
                      </Link>
                    ) : (
                      <p className="text-sm">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="text-sm font-semibold">Device details</div>
            <div className="grid gap-x-6 gap-y-2 md:grid-cols-3 lg:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">Manufacturer</p>
                <p className="text-sm font-semibold">{deviceData.makeModel?.make || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="text-sm font-semibold">{deviceData.makeModel?.model || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="text-sm font-semibold">{deviceData.serialNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Product Number</p>
                <p className="text-sm font-semibold">{deviceData.productNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MAC Address</p>
                <p className="text-sm font-semibold">{deviceData.macAddress || "N/A"}</p>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span>Warranty details</span>
            </div>
            <div className="grid gap-x-6 gap-y-2 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">Start</p>
                <p className="text-sm font-medium">{formatDate(deviceData.warrantyStart ?? null)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End</p>
                <p className="text-sm font-medium">{formatDate(deviceData.warrantyEnd ?? null)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-medium">{deviceData.warrantyType || "Standard warranty"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last update</p>
                <p className="text-sm font-medium">{formatDate(deviceData.updatedAt ?? null)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Warranty link</p>
                {deviceData.warrantyLink ? (
                  <Link
                    href={deviceData.warrantyLink}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" /> Open warranty
                  </Link>
                ) : (
                  <p className="text-sm font-medium">N/A</p>
                )}
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="h-4 w-4" />
              Technical Details
            </div>
            {deviceData.computer ? (
              <div className="grid gap-x-6 gap-y-2 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Operating system</p>
                  <p className="text-sm font-semibold text-sky-600">{deviceData.computer.os}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Domain</p>
                  <p className="font-mono text-sm">{deviceData.computer.domain || "WORKGROUP"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Additional config</p>
                  <p className="text-sm font-medium">{deviceData.computer.config ? "Available" : "No extra data"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No technical specifications registered for this asset.</p>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" />
              Lifecycle
            </div>
            {deviceData.lifecycle ? (
              <div className="grid gap-x-6 gap-y-2 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Purchase date</p>
                  <p className="text-sm font-medium">
                    {formatDate(deviceData.lifecycle.purchaseDate ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End of life</p>
                  <p className="text-sm font-medium">
                    {formatDate(deviceData.lifecycle.endOfLife ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected replacement year</p>
                  <p className="text-sm font-medium">
                    {deviceData.lifecycle.expectedReplacementYear ?? "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-sm font-medium">
                    {deviceData.lifecycle.planDescription || "No plan description"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Billed to</p>
                  <p className="text-sm font-medium">
                    {deviceData.lifecycle.billedToLocation?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost to</p>
                  <p className="text-sm font-medium">
                    {deviceData.lifecycle.costToLocation?.name || "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm font-medium">
                    {deviceData.lifecycle.extraNotes || "No extra notes"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No lifecycle data registered for this asset.</p>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4" />
              Custom attributes
            </div>
            {deviceData.attributes && deviceData.attributes.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {deviceData.attributes.map((attr) => (
                  <Badge key={attr.id} variant="secondary" className="text-xs whitespace-nowrap flex-shrink-0">
                    {attr.key}: {attr.value}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No custom attributes found for this device.</p>
            )}
          </section>

          <Separator />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-4 w-4" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">History tracking coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function DeviceDetails({ deviceData, variant = "default" }: DeviceDetailsProps) {
  if (variant === "compact") {
    return <DeviceDetailsCompact deviceData={deviceData} />
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A"
    const parsedDate = typeof date === "string" ? new Date(date) : date
    if (Number.isNaN(parsedDate.getTime())) return "N/A"
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(parsedDate)
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Link href="/device">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">Asset #{deviceData.id}</p>
              <h2 className="text-3xl font-bold tracking-tight">{deviceData.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">   <Monitor className="h-4 w-4 mr-1" />{deviceData.type?.name ?? "Uncategorized"}</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="icon">
            <Link
              href={`/device/${deviceData.id}/edit`}
              title="Edit device"
              aria-label="Edit device"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="icon">
            <Link
              href={`/device/new?from=${deviceData.id}`}
              title="Add based on this"
              aria-label="Add based on this"
            >
              <Copy className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 self-start rounded-lg border bg-card/80 p-3 shadow-sm">
            <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
            <Badge className={deviceData.status?.color || ""} variant="secondary">
              {deviceData.status?.name ?? "No status"}
            </Badge>
          </div>
        </div>        
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <div>General Information</div>

            <p className="text-xs text-muted-foreground">Created on {formatDate(deviceData.createdAt ?? "N/A")}</p>
          </CardTitle>
          <CardDescription>Consolidated overview of this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm leading-relaxed">{deviceData.description || "No description available."}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cost</p>
                <p className="text-sm font-semibold">{formatCost(deviceData.cost)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Support site</p>
                {deviceData.supportSite ? (
                  <Link href={deviceData.supportSite} target="_blank" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <Globe className="h-3 w-3" /> Open support
                  </Link>
                ) : (
                  <p className="text-sm">N/A</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Drivers</p>
                {deviceData.driversSite ? (
                  <Link href={deviceData.driversSite} target="_blank" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <Globe className="h-3 w-3" /> Open drivers
                  </Link>
                ) : (
                  <p className="text-sm">N/A</p>
                )}
              </div>
            </div>
          </section>          

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Location / User</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-xs font-medium uppercase text-muted-foreground">Current location</p>
                <p className="mt-2 text-base font-semibold">{deviceData.location?.name || "Unassigned"}</p>
                <p className="text-xs text-muted-foreground">{deviceData.location?.address || "No address on file"}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Assigned user</p>
                <p className="mt-2 text-base font-semibold">{deviceData.assignedUser?.name || "Unassigned"}</p>
                <p className="text-xs text-muted-foreground">{deviceData.assignedUser?.email || "No contact on file"}</p>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="text-sm font-semibold">Device details</div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Manufacturer</p>
                <p className="mt-2 text-lg font-semibold">{deviceData.makeModel?.make || "N/A"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="mt-2 text-lg font-semibold">{deviceData.makeModel?.model || "N/A"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Serial Number</p>
              <p className="mt-2 text-lg font-semibold">{deviceData.serialNumber || "N/A"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Product Number</p>
                <p className="mt-2 text-lg font-semibold">{deviceData.productNumber || "N/A"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">MAC Address</p>
                <p className="mt-2 text-lg font-semibold">{deviceData.macAddress || "N/A"}</p>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span>Warranty details</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Start</p>
                <p className="text-base font-medium">{formatDate(deviceData.warrantyStart ?? null)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">End</p>
                <p className="text-base font-medium">{formatDate(deviceData.warrantyEnd ?? null)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-base font-medium">{deviceData.warrantyType || "Standard warranty"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Last update</p>
                <p className="text-base font-medium">{formatDate(deviceData.updatedAt ?? null)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Warranty link</p>
                {deviceData.warrantyLink ? (
                  <Link
                    href={deviceData.warrantyLink}
                    target="_blank"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" /> Open warranty
                  </Link>
                ) : (
                  <p className="text-base font-medium">N/A</p>
                )}
              </div>
            </div>
          </section>

          <Separator />


        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Custom attributes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.attributes && deviceData.attributes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {deviceData.attributes.map((attr) => (
                  <div key={attr.id} className="rounded-lg border p-3">
                    <p className="text-xs uppercase text-muted-foreground">{attr.key}</p>
                    <p className="text-base font-medium">{attr.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No custom attributes found for this device.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Technical Details
            </CardTitle>
            <CardDescription>Settings collected from workstations or servers.</CardDescription>
          </CardHeader>
          <CardContent>
            {deviceData.computer ? (
              <div className="grid gap-6">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Operating system</p>
                    <p className="text-base font-semibold text-sky-600">{deviceData.computer.os}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Domain</p>
                    <p className="font-mono text-sm">{deviceData.computer.domain || "WORKGROUP"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Additional config</p>
                  <pre className="mt-2 max-h-50 overflow-auto rounded-lg bg-muted p-4 text-xs">
                    {typeof deviceData.computer.config === "object"
                      ? JSON.stringify(deviceData.computer.config, null, 2)
                      : String(deviceData.computer.config) || "No extra data."}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Monitor className="mb-4 h-12 w-12 opacity-20" />
                <p>No technical specifications registered for this asset.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Device lifecycle
          </CardTitle>
          <CardDescription>Planning and billing data for this device.</CardDescription>
        </CardHeader>
        <CardContent>
          {deviceData.lifecycle ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Purchase date</p>
                <p className="text-base font-medium">
                  {formatDate(deviceData.lifecycle.purchaseDate ?? null)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">End of life</p>
                <p className="text-base font-medium">
                  {formatDate(deviceData.lifecycle.endOfLife ?? null)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Expected replacement year</p>
                <p className="text-base font-medium">
                  {deviceData.lifecycle.expectedReplacementYear ?? "N/A"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-base font-medium">
                  {deviceData.lifecycle.planDescription || "No plan description"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Billed to</p>
                <p className="text-base font-medium">
                  {deviceData.lifecycle.billedToLocation?.name || "N/A"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Cost to</p>
                <p className="text-base font-medium">
                  {deviceData.lifecycle.costToLocation?.name || "N/A"}
                </p>
              </div>
              <div className="rounded-lg border p-3 md:col-span-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-base font-medium">
                  {deviceData.lifecycle.extraNotes || "No extra notes"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CalendarClock className="mb-4 h-12 w-12 opacity-20" />
              <p>No lifecycle data registered for this asset.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <p>The maintenance and history log will be available soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
