import { DeviceForm, type DeviceFormValues } from "@/components/device-form"
import {
  fetchDeviceRecord,
  mapDeviceRecordToFormValues,
} from "@/lib/device-form-data"

interface NewDevicePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewDevicePage({ searchParams }: NewDevicePageProps) {
  let initialValues: DeviceFormValues | undefined

  const params = searchParams ? await searchParams : undefined
  const fromParam = params?.from
  const sourceId = Array.isArray(fromParam) ? fromParam[0] : fromParam

  if (sourceId) {
    const numericId = Number(sourceId)
    if (Number.isInteger(numericId) && numericId > 0) {
      try {
        const record = await fetchDeviceRecord(numericId)
        if (record) {
          initialValues = mapDeviceRecordToFormValues(record)
        }
      } catch (error) {
        console.error("Failed to load device for duplication", error)
      }
    }
  }

  return <DeviceForm mode="create" initialValues={initialValues} />
}
