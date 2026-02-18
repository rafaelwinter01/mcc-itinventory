"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { WorkstationCard, type WorkstationCardData } from "@/components/workstation-card"
import { WorkstationForm } from "@/modals/Workstation-form"

type WorkstationListProps = {
  workstations: WorkstationCardData[]
}

export function WorkstationList({ workstations }: WorkstationListProps) {
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
      <div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {workstations.map((item) => (
          <WorkstationCard key={item.id} workstation={item} onEdit={handleEdit} />
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
