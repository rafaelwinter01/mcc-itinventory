"use client"

import { Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PreferenceValue } from "@/types/preference"

type DataSettingsMenuProps = {
  disabled?: boolean
  hasLastPreference: boolean
  savedPreferences: PreferenceValue[]
  onLoadLast: () => void
  onLoadSaved: (index: number) => void
  onSaveCurrent: () => void
}

const formatPreferenceDate = (createdAt: PreferenceValue["createdAt"]) => {
  const parsedDate = new Date(createdAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return "-"
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
}

const formatPreferenceName = (name: string) => {
  if (name.length <= 25) {
    return name
  }

  return `${name.slice(0, 25).trimEnd()}...`
}

export function DataSettingsMenu({
  disabled = false,
  hasLastPreference,
  savedPreferences,
  onLoadLast,
  onLoadSaved,
  onSaveCurrent,
}: DataSettingsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label="Data Settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Data Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={!hasLastPreference || disabled}
          onClick={onLoadLast}
        >
          Load Last
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={savedPreferences.length === 0 || disabled}>
            Load Saved
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-60">
            {savedPreferences.length === 0 ? (
              <DropdownMenuItem disabled>No saved settings</DropdownMenuItem>
            ) : (
              savedPreferences.map((preference, index) => (
                <DropdownMenuItem
                  key={`saved-report-${index}-${preference.name}`}
                  onClick={() => onLoadSaved(index)}
                  disabled={disabled}
                  className="flex items-center justify-between gap-3"
                >
                  <span>{formatPreferenceName(preference.name)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatPreferenceDate(preference.createdAt)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={disabled} onClick={onSaveCurrent}>
          Save Current
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
