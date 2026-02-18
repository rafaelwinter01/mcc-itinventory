import { notFound } from "next/navigation"

import { DeviceForm } from "@/components/device-form"
import {
  fetchDeviceRecord,
  mapDeviceRecordToFormValues,
} from "@/lib/device-form-data"

interface EditDevicePageProps {
  params: Promise<{ id: string }>
}

export default async function EditDevicePage({ params }: EditDevicePageProps) {
  const resolvedParams = await params
  const deviceId = Number(resolvedParams.id)

  if (!Number.isInteger(deviceId)) {
    notFound()
  }

  const deviceRecord = await fetchDeviceRecord(deviceId)

  if (!deviceRecord) {
    notFound()
  }

  const initialValues = mapDeviceRecordToFormValues(deviceRecord)

  return <DeviceForm mode="edit" deviceId={deviceId} initialValues={initialValues} />
}
