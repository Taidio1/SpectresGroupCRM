import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 🔐 HELPERY DO SPRAWDZANIA RÓL
 * 
 * Centralne miejsce do zarządzania uprawnieniami ról.
 * Ułatwia utrzymanie i modyfikację uprawnień w przyszłości.
 */

// Role z pełnymi uprawnieniami (szef/admin)
export const ADMIN_ROLES = ['szef', 'admin'] as const

// Role menedżerskie (wszyscy managerowie)
export const MANAGER_ROLES = ['manager', 'project_manager', 'junior_manager'] as const

// Role z dostępem do raportów i statystyk
export const REPORTS_ACCESS_ROLES = [...MANAGER_ROLES, ...ADMIN_ROLES] as const

// Role z dostępem do zarządzania użytkownikami (wszyscy menedżerowie + szef/admin)
export const USER_MANAGEMENT_ROLES = [...MANAGER_ROLES, ...ADMIN_ROLES] as const

// Role z dostępem do promowania użytkowników (tylko szef i admin)
export const USER_PROMOTION_ROLES = [...ADMIN_ROLES] as const

// Role z dostępem do importu plików
export const FILE_IMPORT_ROLES = REPORTS_ACCESS_ROLES

/**
 * Sprawdza czy użytkownik ma rolę menedżerską (manager, project_manager, junior_manager)
 */
export function isManagerLike(userRole?: string): boolean {
  return userRole ? MANAGER_ROLES.includes(userRole as any) : false
}

/**
 * Sprawdza czy użytkownik ma rolę administracyjną (szef, admin)
 */
export function isAdminLike(userRole?: string): boolean {
  return userRole ? ADMIN_ROLES.includes(userRole as any) : false
}

/**
 * Sprawdza czy użytkownik ma dostęp do raportów i statystyk
 */
export function hasReportsAccess(userRole?: string): boolean {
  return userRole ? REPORTS_ACCESS_ROLES.includes(userRole as any) : false
}

/**
 * Sprawdza czy użytkownik może zarządzać innymi użytkownikami
 */
export function canManageUsers(userRole?: string): boolean {
  return userRole ? USER_MANAGEMENT_ROLES.includes(userRole as any) : false
}

/**
 * Sprawdza czy użytkownik może importować pliki
 */
export function canImportFiles(userRole?: string): boolean {
  return userRole ? FILE_IMPORT_ROLES.includes(userRole as any) : false
}

/**
 * Sprawdza czy użytkownik może promować innych użytkowników (tylko szef i admin)
 */
export function canPromoteUsers(userRole?: string): boolean {
  return userRole ? USER_PROMOTION_ROLES.includes(userRole as any) : false
}
