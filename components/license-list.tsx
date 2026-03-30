"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { LicenseCard, type LicenseCardData, type LicenseCardProps } from "@/components/license-card"
import { LicenseForm } from "@/modals/License-form"

type LicenseListProps = {
  licenses: LicenseCardData[]
  variant?: LicenseCardProps["variant"]
}

export function LicenseList({ licenses, variant = "default" }: LicenseListProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  const handleEdit = (id: number) => {
    setActiveId(id)
    setIsOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveId(null)
    }
  }

  const handleSuccess = () => {
    setIsOpen(false)
    setActiveId(null)
    router.refresh()
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {licenses.map((license) => (
          <LicenseCard key={license.id} license={license} onEdit={handleEdit} variant={variant} />
        ))}
      </div>

      <LicenseForm
        open={isOpen}
        onOpenChange={handleOpenChange}
        licenseId={activeId}
        onSuccess={handleSuccess}
      />
    </>
  )
}
