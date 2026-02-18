"use client"

import { useMemo, useState, useTransition } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { DateRange } from "react-day-picker"

import {
  type DeviceFilterState,
  type DeviceFilterOption,
  parseDateRange,
} from "@/lib/device-constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DeviceDataFilterBarProps = {
  defaultValues: DeviceFilterState
  deviceTypeOptions: DeviceFilterOption[]
  statusOptions: DeviceFilterOption[]
  locationOptions: DeviceFilterOption[]
  makeModelOptions: DeviceFilterOption[]
}

export function DeviceDataFilterBar({
  defaultValues,
  deviceTypeOptions,
  statusOptions,
  locationOptions,
  makeModelOptions,
}: DeviceDataFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [deviceName, setDeviceName] = useState(defaultValues.deviceName ?? "")
  const [deviceType, setDeviceType] = useState(defaultValues.deviceType || "all")
  const [status, setStatus] = useState(defaultValues.status || "all")
  const [location, setLocation] = useState(defaultValues.location || "all")
  const [makeModel, setMakeModel] = useState(defaultValues.makeModel || "all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    parseDateRange(defaultValues)
  )

  const rangeLabel = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "MMM dd, yyyy", { locale: enUS })} - ${format(dateRange.to, "MMM dd, yyyy", { locale: enUS })}`
    }

    if (dateRange?.from && !dateRange?.to) {
      return `${format(dateRange.from, "MMM dd, yyyy", { locale: enUS })} - ...`
    }

    return "Select range"
  }, [dateRange])

  const updateUrl = (params: URLSearchParams) => {
    const queryString = params.toString()
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams(searchParams?.toString())

    const setParam = (key: string, value: string) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }

    params.delete("page")

    setParam("name", deviceName.trim())
    setParam("deviceTypeId", deviceType === "all" ? "" : deviceType)
    setParam("statusId", status === "all" ? "" : status)
    setParam("locationId", location === "all" ? "" : location)
    setParam("makeModelId", makeModel === "all" ? "" : makeModel)

    const fromValue = dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : ""
    const toValue = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""

    setParam("warrantyEndStart", fromValue)
    setParam("warrantyEndEnd", toValue)

    updateUrl(params)
  }

  const handleReset = () => {
    setDeviceName("")
    setDeviceType("all")
    setStatus("all")
    setLocation("all")
    setMakeModel("all")
    setDateRange(undefined)
    startTransition(() => {
      router.replace(pathname)
    })
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
      <form
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-6"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="deviceName">Device Name</Label>
          <Input
            id="deviceName"
            placeholder="Ex: MacBook Pro"
            value={deviceName}
            onChange={(event) => setDeviceName(event.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deviceType">Type</Label>
          <Select value={deviceType} onValueChange={setDeviceType}>
            <SelectTrigger id="deviceType" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {deviceTypeOptions.map((option) => (
                <SelectItem key={option.value || option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value || option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1 flex flex-col">
          <Label htmlFor="location">Location</Label>
          <Select value={location} onValueChange={setLocation} >
            <SelectTrigger id="location" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {locationOptions.map((option) => (
                <SelectItem key={option.value || option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="makeModel">Make / Model</Label>
          <Select value={makeModel} onValueChange={setMakeModel}>
            <SelectTrigger id="makeModel" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {makeModelOptions.map((option) => (
                <SelectItem key={option.value || option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Warranty End</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-full overflow-hidden",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {rangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => setDateRange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-end justify-end gap-3 md:col-span-2 lg:col-span-6">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={isPending}>
            Clear
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating..." : "Apply filters"}
          </Button>
        </div>
      </form>
    </div>
  )
}
