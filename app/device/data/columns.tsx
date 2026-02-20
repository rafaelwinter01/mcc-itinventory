"use client"

import { ColumnDef } from "@tanstack/react-table"

export type Device = { 
  id: number
  name: string
  serialNumber?: string | null
  productNumber?: string | null
  macAddress?: string | null
  cost?: string | number | null
  supportSite?: string | null
  driversSite?: string | null
  warrantyType?: string | null
  warrantyStart?: string | Date | null
  warrantyEnd?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  computer?: {
    deviceId?: number
    os?: string | null
    domain?: string | null
    config?: unknown
  } | null
  lifecycle?: {
    id?: number
    deviceId?: number
    purchaseDate?: string | Date | null
    endOfLife?: string | Date | null
    expectedReplacementYear?: number | null
    planDescription?: string | null
    extraNotes?: string | null
    billedTo?: number | null
    costTo?: number | null
    billedToLocation?: {
      id: number
      name: string
    } | null
    costToLocation?: {
      id: number
      name: string
    } | null
  } | null
  type?: {
    id: number
    name: string
    color?: string | null
  } | null
  status?: {
    id: number
    name: string
    color?: string | null
  } | null
  location?: {
    id: number
    name: string
    address?: string | null
  } | null
  makeModel?: {
    id: number
    make?: string | null
    model?: string | null
  } | null
  assignedUser?: {
    id: number
    name: string
    email?: string | null
  } | null
}

export const columns: ColumnDef<Device>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
  },
  {
    id: "type.name",
    accessorKey: "type.name",
    header: "Type",
  },
  {
    id: "status.name",
    accessorKey: "status.name",
    header: "Status",
  },
  {
    id: "location.name",
    accessorKey: "location.name",
    header: "Location",
  },
  {
    id: "assignedUser.name",
    accessorKey: "assignedUser.name",
    header: "Assigned User",
  },
  {
    id: "makeModel",
    accessorFn: (row) => `${row.makeModel?.make || ""} ${row.makeModel?.model || ""}`.trim(),
    header: "Make / Model",
  },
  {
    id: "serialNumber",
    accessorKey: "serialNumber",
    header: "Serial Number",
  },
  {
    id: "productNumber",
    accessorKey: "productNumber",
    header: "Product Number",
  },
  {
    id: "macAddress",
    accessorKey: "macAddress",
    header: "MAC Address",
  },
  {
    id: "computer.os",
    accessorKey: "computer.os",
    header: "OS",
  },
  {
    id: "computer.domain",
    accessorKey: "computer.domain",
    header: "Domain",
  },
  {
    id: "cost",
    accessorKey: "cost",
    header: "Cost",
  },
  {
    id: "warrantyType",
    accessorKey: "warrantyType",
    header: "Warranty Type",
  },
  {
    id: "warrantyStart",
    accessorKey: "warrantyStart",
    header: "Warranty Start",
    cell: ({ row }) => {
      const date = row.getValue("warrantyStart") as string | Date | null
      if (!date) return "-"
      const parsedDate = typeof date === "string" ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return "-"
      return parsedDate.toLocaleDateString("en-US")
    },
  },
  {
    id: "warrantyEnd",
    accessorKey: "warrantyEnd",
    header: "Warranty End",
    cell: ({ row }) => {
      const date = row.getValue("warrantyEnd") as string | Date | null
      if (!date) return "-"
      const parsedDate = typeof date === "string" ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return "-"
      return parsedDate.toLocaleDateString("en-US")
    },
  },
  {
    id: "lifecycle.purchaseDate",
    accessorKey: "lifecycle.purchaseDate",
    header: "Purchase Date",
    cell: ({ row }) => {
      const date = row.getValue("lifecycle.purchaseDate") as string | Date | null
      if (!date) return "-"
      const parsedDate = typeof date === "string" ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return "-"
      return parsedDate.toLocaleDateString("en-US")
    },
  },
  {
    id: "lifecycle.endOfLife",
    accessorKey: "lifecycle.endOfLife",
    header: "End of Life",
    cell: ({ row }) => {
      const date = row.getValue("lifecycle.endOfLife") as string | Date | null
      if (!date) return "-"
      const parsedDate = typeof date === "string" ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return "-"
      return parsedDate.toLocaleDateString("en-US")
    },
  },
  {
    id: "lifecycle.expectedReplacementYear",
    accessorKey: "lifecycle.expectedReplacementYear",
    header: "Expected Replacement Year",
  },
  {
    id: "lifecycle.planDescription",
    accessorKey: "lifecycle.planDescription",
    header: "Plan Description",
  },
  {
    id: "lifecycle.billedToLocation.name",
    accessorKey: "lifecycle.billedToLocation.name",
    header: "Billed To",
  },
  {
    id: "lifecycle.costToLocation.name",
    accessorKey: "lifecycle.costToLocation.name",
    header: "Cost To",
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string | Date | null
      if (!date) return "-"
      const parsedDate = typeof date === "string" ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return "-"
      return parsedDate.toLocaleDateString("en-US")
    },
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as string | Date | null
      if (!date) return "-"
      const parsedDate = typeof date === "string" ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return "-"
      return parsedDate.toLocaleDateString("en-US")
    },
  },
]