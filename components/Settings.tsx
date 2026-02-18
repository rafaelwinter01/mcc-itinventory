"use client"

import { useState } from "react"
import { Settings as SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusForm } from "@/modals/Status-form"
import { MakeModelForm } from "@/modals/MakeModel-form"
import { PeripheralForm } from "@/modals/Peripheral-form"
import { DeviceTypeForm } from "@/modals/DeviceType-form"
import { DepartmentForm } from "@/modals/Department-form"
import { LocationForm } from "@/modals/Location-form"

export function Settings() {
  const [statusFormOpen, setStatusFormOpen] = useState(false)
  const [makeModelFormOpen, setMakeModelFormOpen] = useState(false)
  const [peripheralFormOpen, setPeripheralFormOpen] = useState(false)
  const [deviceTypeFormOpen, setDeviceTypeFormOpen] = useState(false)
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false)
  const [locationFormOpen, setLocationFormOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Device Settings">
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDepartmentFormOpen(true)}>
            Manage Departments
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocationFormOpen(true)}>
            Manage Locations
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setStatusFormOpen(true)}>
            Manage Device Status
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeviceTypeFormOpen(true)}>
            Manage Device Types
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMakeModelFormOpen(true)}>
            Manage Make/Model
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPeripheralFormOpen(true)}>
            Manage Peripherals
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DepartmentForm
        open={departmentFormOpen}
        onOpenChange={setDepartmentFormOpen}
      />

      <LocationForm
        open={locationFormOpen}
        onOpenChange={setLocationFormOpen}
      />

      <StatusForm 
        open={statusFormOpen} 
        onOpenChange={setStatusFormOpen}
      />

      <DeviceTypeForm
        open={deviceTypeFormOpen}
        onOpenChange={setDeviceTypeFormOpen}
      />
      
      <MakeModelForm 
        open={makeModelFormOpen} 
        onOpenChange={setMakeModelFormOpen}
      />

      <PeripheralForm
        open={peripheralFormOpen}
        onOpenChange={setPeripheralFormOpen}
      />
    </>
  )
}
