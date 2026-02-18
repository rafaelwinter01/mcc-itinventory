"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LicenseForm } from "@/modals/License-form"

type LicensePageHeaderProps = {
  title: string
  subtitle?: string
}

export function LicensePageHeader({ title, subtitle }: LicensePageHeaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Add License
      </Button>

      <LicenseForm open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </div>
  )
}
