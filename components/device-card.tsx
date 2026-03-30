import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { Laptop } from "lucide-react"

import type { DeviceRecord } from "@/lib/device-constants"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const formatDate = (value: string | null, pattern = "MMM dd, yyyy") => {
  if (!value) {
    return "Not specified"
  }

  return format(new Date(value), pattern, { locale: enUS })
}

const fallback = (value?: string | null, emptyLabel = "Not specified") => {
  if (!value) return emptyLabel
  const trimmed = value.trim()
  return trimmed.length ? trimmed : emptyLabel
}

const buildMeta = (device: DeviceRecord) => {
  const statusLabel = fallback(device.status?.name, "No status")
  const typeLabel = fallback(device.type?.name, "No type")
  const manufacturerLabel = fallback(device.makeModel?.make, "No manufacturer")
  const modelLabel = fallback(device.makeModel?.model, "No model")
  const locationLabel = fallback(device.location?.name, "No location")
  const assignedUserLabel = fallback(device.assignedUser?.name, "Unassigned")
  const warrantyLabel = formatDate(device.warrantyEnd)

  return {
    statusLabel,
    typeLabel,
    manufacturerLabel,
    modelLabel,
    locationLabel,
    assignedUserLabel,
    warrantyLabel,
  }
}

const detailItems = (device: DeviceRecord, meta: ReturnType<typeof buildMeta>): { label: string; value: string }[] => [
  { label: "Manufacturer", value: meta.manufacturerLabel },
  { label: "Model", value: meta.modelLabel },
  { label: "Location", value: meta.locationLabel },
  { label: "Assigned user", value: meta.assignedUserLabel },
  { label: "Warranty end", value: meta.warrantyLabel },
]

export type DeviceCardProps = {
  device: DeviceRecord
  variant?: "default" | "compact" | "classic"
}

const renderLaptopBadge = () => (
  <div className="rounded-full bg-primary/10 p-2">
    <Laptop className="h-4 w-4 text-primary" />
  </div>
)

export function DeviceCardClassic({ device }: DeviceCardProps) {
  const meta = buildMeta(device)

  return (
    <Link href={`/device/${device.id}`} className="block" prefetch={false}>
      <Card className="w-full shadow-sm transition-all hover:bg-muted/40 hover:border-primary/40 p-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-sm sm:grid-cols-12 sm:items-center">
          {/* Name & Type */}
          <div className="col-span-2 flex items-center gap-2 sm:col-span-3">
            <span className="truncate font-medium text-foreground" title={device.name}>
              {device.name}
            </span>
            <Badge
              variant="secondary"
              className="hidden h-5 shrink-0 px-1.5 text-[10px] font-normal text-muted-foreground sm:inline-flex"
            >
              {meta.typeLabel}
            </Badge>
          </div>

          {/* Make / Model */}
          <div
            className="col-span-1 truncate text-xs text-muted-foreground sm:col-span-2 sm:text-sm"
            title={`${meta.manufacturerLabel} ${meta.modelLabel}`}
          >
            {meta.manufacturerLabel} {meta.modelLabel}
          </div>

          {/* Location */}
          <div
            className="col-span-1 truncate text-xs text-muted-foreground sm:col-span-2 sm:text-sm"
            title={meta.locationLabel}
          >
            {meta.locationLabel}
          </div>

          {/* User */}
          <div
            className="col-span-1 truncate text-xs text-muted-foreground sm:col-span-2 sm:text-sm"
            title={meta.assignedUserLabel}
          >
            {meta.assignedUserLabel}
          </div>

          {/* Warranty */}
          <div
            className="col-span-1 truncate text-xs text-muted-foreground sm:col-span-1 sm:text-sm"
            title={meta.warrantyLabel}
          >
            {meta.warrantyLabel}
          </div>

          {/* Status */}
          <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-2 sm:justify-end">
            <Badge
              variant="outline"
              className={cn(
                "border-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                meta.statusLabel === "No status"
                  ? "bg-muted text-muted-foreground"
                  : device.status?.color
              )}
            >
              {meta.statusLabel}
            </Badge>
            {renderLaptopBadge()}
          </div>
        </div>
      </Card>
    </Link>
  )
}


export function DeviceCardCompact({ device }: DeviceCardProps) {
  const meta = buildMeta(device)

  return (
    <Link href={`/device/${device.id}`} className="block" prefetch={false}>
      <Card className="w-full transition-all hover:bg-accent/5 hover:border-primary/30 p-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 items-center">
          
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {meta.typeLabel}
            </span>
            <span className="text-sm font-bold leading-none text-foreground truncate" title={device.name}>
              {device.name}
            </span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              Make / Model
            </span>
            <span className="text-sm font-medium leading-none text-foreground truncate" title={`${meta.manufacturerLabel} ${meta.modelLabel}`}>
              {meta.manufacturerLabel} {meta.modelLabel}
            </span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              Location
            </span>
            <span className="text-sm font-medium leading-none text-foreground truncate" title={meta.locationLabel}>
              {meta.locationLabel}
            </span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              User
            </span>
            <span className="text-sm font-medium leading-none text-foreground truncate" title={meta.assignedUserLabel}>
              {meta.assignedUserLabel}
            </span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              Warranty
            </span>
            <span className="text-sm font-medium leading-none text-foreground truncate" title={meta.warrantyLabel}>
              {meta.warrantyLabel}
            </span>
          </div>

          <div className="flex justify-between"
          >

          <div className="flex flex-col gap-1 min-w-0 ">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              Status
            </span>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "border-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide h-auto min-h-0 rounded-sm", 
                  meta.statusLabel === "No status"
                  ? "bg-muted text-muted-foreground"
                  : device.status?.color || "bg-secondary text-secondary-foreground"
                )}
                >
                {meta.statusLabel}
              </Badge>
            </div>
          </div>
          <div className="grid place-items-center">
            {renderLaptopBadge()}
          </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export function DeviceCard({ device, variant = "default" }: DeviceCardProps) {
  if (variant === "compact") {
    return <DeviceCardCompact device={device} variant={variant} />
  }
  if (variant === "classic") {
    return <DeviceCardClassic device={device} variant={variant} />
  }

  const meta = buildMeta(device)

  const badgeClassName = cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    meta.statusLabel === "No status"
      ? "bg-muted text-muted-foreground"
      : device.status?.color || "bg-secondary text-secondary-foreground"
  )

  return (
    <Link href={`/device/${device.id}`} className="block" prefetch={false}>
      <Card className="w-full transition hover:border-primary/40 focus-visible:border-primary/60">
        <CardHeader className="space-y-1 pb-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-semibold">{device.name}</CardTitle>
              <Badge variant="outline" className="text-xs uppercase tracking-wide">
                {meta.typeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className={badgeClassName}>{meta.statusLabel}</span>
              {renderLaptopBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3 lg:grid-cols-5">
          {detailItems(device, meta).map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="font-medium text-foreground" title={item.value}>
                {item.value}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </Link>
  )
}
