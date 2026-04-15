"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { usePreferencesStore } from "@/stores/preferences-store"

export function PreferencesLoader() {
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences)
  const cardModel = usePreferencesStore((state) => state.cardModel)
  const pathname = usePathname()

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"

  useEffect(() => {
    if (isPublicRoute) {
      return
    }

    loadPreferences().catch(() => {
      return
    })
  }, [isPublicRoute, loadPreferences])

  useEffect(() => {
    document.documentElement.setAttribute("data-card-model", cardModel)
  }, [cardModel])

  return null
}
