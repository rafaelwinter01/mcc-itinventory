"use client"

import { useEffect } from "react"
import { usePreferencesStore } from "@/stores/preferences-store"

export function PreferencesLoader() {
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences)
  const cardModel = usePreferencesStore((state) => state.cardModel)

  useEffect(() => {
    loadPreferences().catch(() => {
      return
    })
  }, [loadPreferences])

  useEffect(() => {
    document.documentElement.setAttribute("data-card-model", cardModel)
  }, [cardModel])

  return null
}
