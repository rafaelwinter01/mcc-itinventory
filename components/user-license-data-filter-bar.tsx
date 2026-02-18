"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type UserLicenseFilterOption = {
  label: string
  value: string
}

export type UserLicenseFilterState = {
  query?: string
  userId?: string
  licenseId?: string
  active?: string
}

type UserLicenseDataFilterBarProps = {
  defaultValues: UserLicenseFilterState
  userOptions: UserLicenseFilterOption[]
  licenseOptions: UserLicenseFilterOption[]
}

export function UserLicenseDataFilterBar({
  defaultValues,
  userOptions,
  licenseOptions,
}: UserLicenseDataFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(defaultValues.query ?? "")
  const [userId, setUserId] = useState(defaultValues.userId || "all")
  const [licenseId, setLicenseId] = useState(defaultValues.licenseId || "all")
  const [active, setActive] = useState(defaultValues.active || "all")

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

    setParam("q", query.trim())
    setParam("userId", userId === "all" ? "" : userId)
    setParam("licenseId", licenseId === "all" ? "" : licenseId)
    setParam("active", active === "all" ? "" : active)

    updateUrl(params)
  }

  const handleReset = () => {
    setQuery("")
    setUserId("all")
    setLicenseId("all")
    setActive("all")
    startTransition(() => {
      router.replace(pathname)
    })
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
      <form
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="query">Search</Label>
          <Input
            id="query"
            placeholder="User or license"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="userId">User</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="userId" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {userOptions.map((option) => (
                <SelectItem key={option.value || option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseId">License</Label>
          <Select value={licenseId} onValueChange={setLicenseId}>
            <SelectTrigger id="licenseId" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {licenseOptions.map((option) => (
                <SelectItem key={option.value || option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="active">Active</Label>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger id="active" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end justify-end gap-3 md:col-span-2 lg:col-span-4">
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
