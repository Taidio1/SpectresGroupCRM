# IMPLEMENTACJA SYSTEMU UPRAWNIEŃ - INSTRUKCJE

## 🎯 Co zostało zaimplementowane

### ✅ 1. Dokumentacja
- **StrukturaDB.txt** - kompletna specyfikacja systemu uprawnień
- **migration_add_owner_id.sql** - migracja SQL do wykonania w bazie danych

### ✅ 2. Backend (API)
- **lib/supabase.ts** - dodano:
  - `owner_id` do interfejsu `Client`
  - `permissionsApi` z funkcjami sprawdzania uprawnień
  - Zaktualizowano `clientsApi` z filtrowaniem na podstawie ról
  - Nowe funkcje: `assignClient()`, sprawdzanie uprawnień przed CRUD

### ✅ 3. Frontend (Komponenty)
- **components/clients-table.tsx** - dodano:
  - Sprawdzanie uprawnień przed edycją/usunięciem
  - Ukrywanie przycisków na podstawie roli użytkownika
  - Informacje o właścicielu klienta
  - Automatyczne przypisywanie właściciela przy tworzeniu

## 🚀 Kroki do pełnej implementacji

### Krok 3: Zaktualizuj pozostałe komponenty (TODO)

#### 3.1 Dashboard (components/dashboard.tsx)
- [ ] Dodać filtrowanie statystyk na podstawie uprawnień
- [ ] Ukryć sekcje dostępne tylko dla wyższych ról

#### 3.2 Reports (components/reports.tsx)  
- [ ] Ograniczyć raporty dla pracowników
- [ ] Dodać zaawansowane raporty dla manager+

#### 3.3 Activity Logs
- [ ] Filtrować logi aktywności na podstawie uprawnień
- [ ] Dodać logowanie operacji związanych z uprawnieniami

### Krok 4: Dodaj hook do zarządzania uprawnieniami
```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useAuth()
  
  return {
    canEdit: (client: Client) => permissionsApi.canEdit(client, user),
    canDelete: (client: Client) => permissionsApi.canDelete(client, user),
    canAssignClients: () => permissionsApi.canAssignClients(user),
    // ... inne funkcje
  }
}
```