import { type MultiEditColumn } from "@/modals/MultiEditDevice-form"

export type DeviceBulkEditField = Omit<MultiEditColumn, "options"> & {
  columnId: string
  fkKey?: "deviceType" | "status" | "location" | "department" | "makeModel" | "assignedUser"
}

export const DEVICE_BULK_EDIT_SCHEMA: DeviceBulkEditField[] = [
  { columnId: "name", key: "name", label: "Name", type: "text" },
  { columnId: "type.name", key: "deviceTypeId", label: "Type", isForeignKey: true, fkKey: "deviceType" },
  { columnId: "status.name", key: "statusId", label: "Status", isForeignKey: true, fkKey: "status" },
  { columnId: "location.name", key: "locationId", label: "Location", isForeignKey: true, fkKey: "location" },
  { columnId: "assignedUser.name", key: "assignedUserId", label: "Assigned User", isForeignKey: true, fkKey: "assignedUser" },
  { columnId: "makeModel", key: "makeModelId", label: "Make / Model", isForeignKey: true, fkKey: "makeModel" },
  { columnId: "serialNumber", key: "serialNumber", label: "Serial Number", type: "text" },
  { columnId: "productNumber", key: "productNumber", label: "Product Number", type: "text" },
  { columnId: "macAddress", key: "macAddress", label: "MAC Address", type: "text" },
  { columnId: "computer.os", key: "computerOs", label: "OS", type: "text" },
  { columnId: "computer.domain", key: "computerDomain", label: "Domain", type: "text" },
  { columnId: "cost", key: "cost", label: "Cost", type: "number" },
  { columnId: "warrantyType", key: "warrantyType", label: "Warranty Type", type: "text" },
  { columnId: "warrantyStart", key: "warrantyStart", label: "Warranty Start", type: "date" },
  { columnId: "warrantyEnd", key: "warrantyEnd", label: "Warranty End", type: "date" },
  { columnId: "lifecycle.purchaseDate", key: "purchaseDate", label: "Purchase Date", type: "date" },
  { columnId: "lifecycle.endOfLife", key: "endOfLife", label: "End of Life", type: "date" },
  { columnId: "lifecycle.expectedReplacementYear", key: "expectedReplacementYear", label: "Expected Replacement Year", type: "number" },
  { columnId: "lifecycle.planDescription", key: "planDescription", label: "Plan Description", type: "text" },
  { columnId: "lifecycle.billedToLocation.name", key: "billedTo", label: "Billed To", isForeignKey: true, fkKey: "department" },
  { columnId: "lifecycle.costToLocation.name", key: "costTo", label: "Cost To", isForeignKey: true, fkKey: "department" },
]
