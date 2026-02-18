"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type WorkstationFilterState = {
  name?: string
  assignedUser?: string
  deviceName?: string
  attributeKey?: string
  attributeValue?: string
}

type WorkstationFilterBarProps = {
  defaultValues: WorkstationFilterState
}

export function WorkstationFilterBar({ defaultValues }: WorkstationFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(defaultValues.name ?? "")
  const [assignedUser, setAssignedUser] = useState(defaultValues.assignedUser ?? "")
  const [deviceName, setDeviceName] = useState(defaultValues.deviceName ?? "")
  const [attributeKey, setAttributeKey] = useState(defaultValues.attributeKey ?? "")
  const [attributeValue, setAttributeValue] = useState(defaultValues.attributeValue ?? "")

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

    setParam("name", name.trim())
    setParam("assignedUser", assignedUser.trim())
    setParam("deviceName", deviceName.trim())
    setParam("attributeKey", attributeKey.trim())
    setParam("attributeValue", attributeValue.trim())

    updateUrl(params)
  }

  const handleReset = () => {
    setName("")
    setAssignedUser("")
    setDeviceName("")
    setAttributeKey("")
    setAttributeValue("")
    startTransition(() => {
      router.replace(pathname)
    })
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
      <form
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-5"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="workstationName">Workstation Name</Label>
          <Input
            id="workstationName"
            placeholder="e.g. Lab 2"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedUser">Assigned User</Label>
          <Input
            id="assignedUser"
            placeholder="e.g. John Doe"
            value={assignedUser}
            onChange={(event) => setAssignedUser(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deviceName">Device Name</Label>
          <Input
            id="deviceName"
            placeholder="e.g. Dell OptiPlex"
            value={deviceName}
            onChange={(event) => setDeviceName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="attributeKey">Attribute Key</Label>
          <Input
            id="attributeKey"
            placeholder="e.g. location"
            value={attributeKey}
            onChange={(event) => setAttributeKey(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="attributeValue">Attribute Value</Label>
          <Input
            id="attributeValue"
            placeholder="e.g. Lab 1"
            value={attributeValue}
            onChange={(event) => setAttributeValue(event.target.value)}
          />
        </div>

        <div className="flex items-end justify-end gap-3 md:col-span-2 lg:col-span-5">
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
