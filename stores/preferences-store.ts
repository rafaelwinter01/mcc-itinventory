import { create } from "zustand"
import {
  CARD_MODEL,
  CARD_MODEL_KEYS,
  DEVICE_PAGE_MODEL,
  DEVICE_PAGE_MODEL_KEYS,
} from "@/constants/preferences"

type MeResponse = {
  username?: string
}

type PreferencesResponse = {
  data?: {
    last?: Record<string, unknown>
  }
}

type PreferencesState = {
  username: string | null
  cardModel: CARD_MODEL_KEYS
  devicePageModel: DEVICE_PAGE_MODEL_KEYS
  loaded: boolean
  isLoading: boolean
  isSaving: boolean
  setCardModel: (model: CARD_MODEL_KEYS) => void
  setDevicePageModel: (model: DEVICE_PAGE_MODEL_KEYS) => void
  loadPreferences: (force?: boolean) => Promise<void>
  saveCardModel: (model: CARD_MODEL_KEYS) => Promise<void>
  saveDevicePageModel: (model: DEVICE_PAGE_MODEL_KEYS) => Promise<void>
}

const CARD_MODEL_VALUES = Object.values(CARD_MODEL_KEYS)
const DEVICE_PAGE_MODEL_VALUES = Object.values(DEVICE_PAGE_MODEL_KEYS)

const getModelFromLastPreference = (last?: Record<string, unknown>) => {
  if (!last) {
    return CARD_MODEL_KEYS.DEFAULT
  }

  const directValue = last.cardModel
  if (typeof directValue === "string" && CARD_MODEL_VALUES.includes(directValue as CARD_MODEL_KEYS)) {
    return directValue as CARD_MODEL_KEYS
  }

  const fallbackValue = last.value
  if (typeof fallbackValue === "string" && CARD_MODEL_VALUES.includes(fallbackValue as CARD_MODEL_KEYS)) {
    return fallbackValue as CARD_MODEL_KEYS
  }

  return CARD_MODEL_KEYS.DEFAULT
}

const getDevicePageModelFromLastPreference = (last?: Record<string, unknown>) => {
  if (!last) {
    return DEVICE_PAGE_MODEL_KEYS.DEFAULT
  }

  const directValue = last.devicePageModel
  if (
    typeof directValue === "string" &&
    DEVICE_PAGE_MODEL_VALUES.includes(directValue as DEVICE_PAGE_MODEL_KEYS)
  ) {
    return directValue as DEVICE_PAGE_MODEL_KEYS
  }

  const fallbackValue = last.value
  if (
    typeof fallbackValue === "string" &&
    DEVICE_PAGE_MODEL_VALUES.includes(fallbackValue as DEVICE_PAGE_MODEL_KEYS)
  ) {
    return fallbackValue as DEVICE_PAGE_MODEL_KEYS
  }

  return DEVICE_PAGE_MODEL_KEYS.DEFAULT
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  username: null,
  cardModel: CARD_MODEL_KEYS.DEFAULT,
  devicePageModel: DEVICE_PAGE_MODEL_KEYS.DEFAULT,
  loaded: false,
  isLoading: false,
  isSaving: false,

  setCardModel: (model) => {
    set({ cardModel: model })
  },

  setDevicePageModel: (model) => {
    set({ devicePageModel: model })
  },

  loadPreferences: async (force = false) => {
    const currentState = get()
    if (currentState.loaded && !force) {
      return
    }

    set({ isLoading: true })

    try {
      let username = get().username

      if (!username) {
        const meResponse = await fetch("/api/auth/me")
        if (!meResponse.ok) {
          throw new Error("Failed to load profile")
        }

        const meData = (await meResponse.json()) as MeResponse
        if (!meData.username) {
          throw new Error("Profile without username")
        }

        username = meData.username
      }

      const params = new URLSearchParams({
        username,
        key: CARD_MODEL,
      })

      const devicePageParams = new URLSearchParams({
        username,
        key: DEVICE_PAGE_MODEL,
      })

      const [preferenceResponse, devicePagePreferenceResponse] = await Promise.all([
        fetch(`/api/auth/me/preferences?${params.toString()}`),
        fetch(`/api/auth/me/preferences?${devicePageParams.toString()}`),
      ])

      if (!preferenceResponse.ok || !devicePagePreferenceResponse.ok) {
        throw new Error("Failed to load preferences")
      }

      const [preferenceData, devicePagePreferenceData] = (await Promise.all([
        preferenceResponse.json(),
        devicePagePreferenceResponse.json(),
      ])) as [PreferencesResponse, PreferencesResponse]

      const parsedModel = getModelFromLastPreference(preferenceData.data?.last)
      const parsedDevicePageModel = getDevicePageModelFromLastPreference(
        devicePagePreferenceData.data?.last
      )

      set({
        username,
        cardModel: parsedModel,
        devicePageModel: parsedDevicePageModel,
        loaded: true,
      })
    } finally {
      set({ isLoading: false })
    }
  },

  saveCardModel: async (model) => {
    const state = get()
    if (!state.username) {
      await state.loadPreferences(true)
    }

    const username = get().username
    if (!username) {
      throw new Error("Unable to identify current user")
    }

    set({ isSaving: true })

    try {
      const response = await fetch("/api/auth/me/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "last",
          property: CARD_MODEL,
          value: {
            cardModel: model,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      set({ cardModel: model, loaded: true })
    } finally {
      set({ isSaving: false })
    }
  },

  saveDevicePageModel: async (model) => {
    const state = get()
    if (!state.username) {
      await state.loadPreferences(true)
    }

    const username = get().username
    if (!username) {
      throw new Error("Unable to identify current user")
    }

    set({ isSaving: true })

    try {
      const response = await fetch("/api/auth/me/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "last",
          property: DEVICE_PAGE_MODEL,
          value: {
            devicePageModel: model,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      set({ devicePageModel: model, loaded: true })
    } finally {
      set({ isSaving: false })
    }
  },
}))
