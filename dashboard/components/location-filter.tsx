"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/store/useStore"
import { locationsApi, permissionsApi } from "@/lib/supabase"
import type { Location } from "@/lib/supabase"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Globe, MapPin } from "lucide-react"

interface LocationFilterProps {
  selectedLocationId?: string | null
  onLocationChange: (locationId: string | null) => void
  showAllOption?: boolean
  disabled?: boolean
}

/**
 * 🌍 LOCATION FILTER COMPONENT
 * 
 * Komponent filtrowania po lokalizacjach/krajach
 * - Szef i Admin widzą wszystkie lokalizacje
 * - Project Manager i Junior Manager mogą filtrować po swojej lokalizacji
 * - Manager i Pracownik widzą tylko swoją lokalizację
 */
export function LocationFilter({ 
  selectedLocationId, 
  onLocationChange, 
  showAllOption = true,
  disabled = false 
}: LocationFilterProps) {
  const { user } = useAuth()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  // Sprawdź czy użytkownik może filtrować po lokalizacjach
  const canFilter = user ? permissionsApi.canFilterByLocation(user) : false
  const canViewAll = user ? permissionsApi.canViewAllLocations(user) : false

  useEffect(() => {
    if (!user) return

    const loadLocations = async () => {
      try {
        setLoading(true)
        
        let availableLocations: Location[]
        
        if (canViewAll) {
          // Szef i admin widzą wszystkie lokalizacje
          availableLocations = await locationsApi.getAllLocations()
        } else {
          // Pozostali widzą tylko dostępne dla nich lokalizacje
          availableLocations = await locationsApi.getUserAccessibleLocations(user.id)
        }
        
        setLocations(availableLocations)
        
        // Jeśli użytkownik nie może filtrować i nie ma wybranej lokalizacji,
        // automatycznie ustaw jego lokalizację
        if (!canFilter && !selectedLocationId && user.location_id) {
          onLocationChange(user.location_id)
        }
        
      } catch (error) {
        console.error('Błąd ładowania lokalizacji:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [user, canViewAll, canFilter, selectedLocationId, onLocationChange])

  // Jeśli użytkownik nie może filtrować, pokaż tylko informację o jego lokalizacji
  if (!canFilter) {
    const userLocation = locations.find(loc => loc.id === user?.location_id)
    if (!userLocation && !loading) return null
    
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {userLocation?.name || 'Brak lokalizacji'}
        </span>
        <Badge variant="outline" className="text-xs">
          {userLocation?.code}
        </Badge>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md animate-pulse">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Ładowanie...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedLocationId || "all"}
        onValueChange={(value) => onLocationChange(value === "all" ? null : value)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Wybierz lokalizację" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && canViewAll && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Wszystkie kraje</span>
              </div>
            </SelectItem>
          )}
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{location.name}</span>
                <Badge variant="outline" className="text-xs">
                  {location.code}
                </Badge>
                {location.currency && (
                  <span className="text-xs text-muted-foreground">
                    {location.currency}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * 🏷️ LOCATION BADGE COMPONENT
 * 
 * Komponent wyświetlający informacje o lokalizacji
 */
interface LocationBadgeProps {
  location?: Location | null
  showCurrency?: boolean
  variant?: "default" | "secondary" | "outline"
}

export function LocationBadge({ 
  location, 
  showCurrency = false, 
  variant = "outline" 
}: LocationBadgeProps) {
  if (!location) return null

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <MapPin className="h-3 w-3" />
      <span>{location.code}</span>
      {showCurrency && location.currency && (
        <span className="text-xs opacity-75">
          ({location.currency})
        </span>
      )}
    </Badge>
  )
}

/**
 * 🌍 LOCATION HEADER COMPONENT
 * 
 * Komponent nagłówka z informacją o aktualnej lokalizacji
 */
interface LocationHeaderProps {
  selectedLocationId?: string | null
  showProjectManager?: boolean
}

export function LocationHeader({ 
  selectedLocationId, 
  showProjectManager = false 
}: LocationHeaderProps) {
  const { user } = useAuth()
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedLocationId) {
      setLocation(null)
      return
    }

    const loadLocation = async () => {
      try {
        setLoading(true)
        const locationData = await locationsApi.getLocationById(selectedLocationId)
        setLocation(locationData)
      } catch (error) {
        console.error('Błąd ładowania lokalizacji:', error)
        setLocation(null)
      } finally {
        setLoading(false)
      }
    }

    loadLocation()
  }, [selectedLocationId])

  // Sprawdź czy użytkownik może widzieć nagłówek lokalizacji
  const canSeeLocationHeader = user && permissionsApi.canFilterByLocation(user)

  if (!canSeeLocationHeader) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg animate-pulse">
        <Globe className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Ładowanie lokalizacji...</span>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
        <Globe className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Wszystkie kraje
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            {location.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            {location.code}
          </Badge>
          {location.currency && (
            <Badge variant="outline">
              {location.currency}
            </Badge>
          )}
        </div>
      </div>

      {showProjectManager && location.project_manager && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Project Manager:</span>
          <span className="font-medium text-foreground">
            {location.project_manager.full_name}
          </span>
        </div>
      )}
    </div>
  )
} 