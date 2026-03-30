"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { WorkstationCard, type WorkstationCardData, type WorkstationCardProps } from "@/components/workstation-card"
import { WorkstationForm } from "@/modals/Workstation-form"

type WorkstationListProps = {
  workstations: WorkstationCardData[]
  variant?: WorkstationCardProps["variant"]
}

export function WorkstationList({ workstations, variant = "default" }: WorkstationListProps) {
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
      <div
        className={
          variant === "classic"
            ? "grid gap-4 lg:grid-cols-2"
            : "grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
        }
      >
        {workstations.map((item) => (
          <WorkstationCard key={item.id} workstation={item} onEdit={handleEdit} variant={variant} />
        ))}
      </div>

      <WorkstationForm
        open={isOpen}
        onOpenChange={handleOpenChange}
        workstationId={activeId}
        onSuccess={handleSuccess}
      />
    </>
  )
}
