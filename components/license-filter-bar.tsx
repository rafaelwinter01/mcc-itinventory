"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type LicenseFilterState = {
  name?: string
}

type LicenseFilterBarProps = {
  defaultValues: LicenseFilterState
}

export function LicenseFilterBar({ defaultValues }: LicenseFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(defaultValues.name ?? "")

  const updateUrl = (params: URLSearchParams) => {
    const queryString = params.toString()
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams(searchParams?.toString())

    if (name.trim()) {
      params.set("name", name.trim())
    } else {
      params.delete("name")
    }

    updateUrl(params)
  }

  const handleReset = () => {
    setName("")
    startTransition(() => {
      router.replace(pathname)
    })
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
      <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleSubmit}>
        <div className="flex-1 space-y-2">
          <Label htmlFor="licenseName">License Name</Label>
          <Input
            id="licenseName"
            placeholder="Ex: Microsoft 365"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="flex gap-3">
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
