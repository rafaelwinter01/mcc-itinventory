"use client"

import { ColumnDef } from "@tanstack/react-table"

export type UserLicenseRow = {
  userId: number
  licenseId: number
  userName: string
  userEmail?: string | null
  licenseName: string
  cost?: string | number | null
  billingFrequency?: string | null
  active?: boolean | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

const formatDate = (value: string | Date | null) => {
  if (!value) return "-"
  const parsedDate = typeof value === "string" ? new Date(value) : value
  if (isNaN(parsedDate.getTime())) return "-"
  return parsedDate.toLocaleDateString("en-US")
}

export const columns: ColumnDef<UserLicenseRow>[] = [
  {
    id: "userName",
    accessorKey: "userName",
    header: "User",
  },
  {
    id: "userEmail",
    accessorKey: "userEmail",
    header: "Email",
    cell: ({ row }) => row.getValue("userEmail") || "-",
  },
  {
    id: "licenseName",
    accessorKey: "licenseName",
    header: "License",
  },
  {
    id: "cost",
    accessorKey: "cost",
    header: "Cost",
    cell: ({ row }) => row.getValue("cost") ?? "-",
  },
  {
    id: "billingFrequency",
    accessorKey: "billingFrequency",
    header: "Billing",
    cell: ({ row }) => row.getValue("billingFrequency") || "-",
  },
  {
    id: "active",
    accessorKey: "active",
    header: "Active",
    cell: ({ row }) => {
      const value = row.getValue("active")
      if (value === null || value === undefined) return "-"
      return value ? "Yes" : "No"
    },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Assigned At",
    cell: ({ row }) => formatDate(row.getValue("createdAt") as string | Date | null),
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => formatDate(row.getValue("updatedAt") as string | Date | null),
  },
]