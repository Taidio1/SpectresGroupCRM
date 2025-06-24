import { useMemo } from 'react'
import { useAuth } from '@/store/useStore'
import type { User } from '@/lib/supabase'

export interface Permissions {
  // Podstawowe uprawnienia
  canViewAllLocations: boolean
  canFilterByLocation: boolean
  canManageUsers: boolean
  canDeleteClients: boolean
  canAssignClients: boolean
  
  // Uprawnienia dla połączeń
  canViewAllCalls: boolean
  canViewLocationCalls: boolean
  canViewOwnCalls: boolean
  
  // Informacje o roli
  role: User['role']
  isManager: boolean
  isEmployee: boolean
  isHigherRole: boolean
}

/**
 * 🔐 HOOK DO ZARZĄDZANIA UPRAWNIENIAMI
 * 
 * Sprawdza uprawnienia użytkownika na podstawie jego roli w hierarchii:
 * - admin (-1): wszystko
 * - szef (0): wszystko oprócz zarządzania adminami
 * - project_manager (1): wszystko w swojej lokalizacji + podwładni
 * - junior_manager (3): wszystko w swojej lokalizacji
 * - manager (2): wszystko w swojej lokalizacji  
 * - pracownik (4): tylko swoje dane
 */
export function usePermissions(): Permissions {
  const { user } = useAuth()

  const permissions = useMemo((): Permissions => {
    if (!user) {
      return {
        canViewAllLocations: false,
        canFilterByLocation: false,
        canManageUsers: false,
        canDeleteClients: false,
        canAssignClients: false,
        canViewAllCalls: false,
        canViewLocationCalls: false,
        canViewOwnCalls: false,
        role: 'pracownik',
        isManager: false,
        isEmployee: true,
        isHigherRole: false
      }
    }

    const role = user.role
    const isEmployee = role === 'pracownik'
    const isManager = ['junior_manager', 'manager', 'project_manager'].includes(role)
    const isHigherRole = ['szef', 'admin'].includes(role)

    // Szef i Admin - pełne uprawnienia
    if (isHigherRole) {
      return {
        canViewAllLocations: true,
        canFilterByLocation: true,
        canManageUsers: role === 'admin' || role === 'szef',
        canDeleteClients: true,
        canAssignClients: true,
        canViewAllCalls: true,
        canViewLocationCalls: true,
        canViewOwnCalls: true,
        role,
        isManager: false,
        isEmployee: false,
        isHigherRole: true
      }
    }

    // Project Manager, Junior Manager, Manager - uprawnienia lokalizacyjne
    if (isManager) {
      return {
        canViewAllLocations: role === 'project_manager', // Tylko PM może widzieć wszystkie kraje
        canFilterByLocation: true,
        canManageUsers: role === 'project_manager',
        canDeleteClients: true,
        canAssignClients: true,
        canViewAllCalls: false,
        canViewLocationCalls: true, // Widzą połączenia w swojej lokalizacji
        canViewOwnCalls: true,
        role,
        isManager: true,
        isEmployee: false,
        isHigherRole: false
      }
    }

    // Pracownik - minimalne uprawnienia
    return {
      canViewAllLocations: false,
      canFilterByLocation: false,
      canManageUsers: false,
      canDeleteClients: false,
      canAssignClients: false,
      canViewAllCalls: false,
      canViewLocationCalls: false,
      canViewOwnCalls: true, // Tylko swoje połączenia
      role,
      isManager: false,
      isEmployee: true,
      isHigherRole: false
    }
  }, [user])

  return permissions
} 