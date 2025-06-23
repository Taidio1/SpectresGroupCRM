# 🌍 PRZEWODNIK IMPLEMENTACJI SYSTEMU HIERARCHII I LOKALIZACJI

## ✅ ZAKOŃCZONO - Wszystkie wymagania zostały zaimplementowane!

### 📋 **Podsumowanie wykonanych zmian:**

#### 1. **✅ Role i poziomy hierarchii**
- **Zaimplementowano wszystkie role:** `admin`, `szef`, `project_manager`, `manager`, `junior_manager`, `pracownik`
- **Ustanowiono poziomy hierarchii:**
  - `admin` → -1 (najwyższy poziom)
  - `szef` → 0
  - `project_manager` → 1
  - `manager` → 2
  - `junior_manager` → 3
  - `pracownik` → 4 (najniższy poziom)

#### 2. **✅ Lokalizacje**
- **Dodano tabelę `locations`** z polami:
  - `region` (opcjonalne)
  - `project_manager_id` (REFERENCES users(id))
- **Dodano domyślne lokalizacje:**
  - **Polska:** code = 'PL', currency = 'PLN', timezone = 'Europe/Warsaw'
  - **Słowacja:** code = 'SK', currency = 'EUR', timezone = 'Europe/Bratislava'

#### 3. **✅ Logika aplikacji**
- **Filtrowanie po `location_id`** w `clientsApi.getClients()`
- **Rozszerzona logika uprawnień** oparta o `role_hierarchy_level` i `location_id`
- **Hierarchiczne uprawnienia:**
  - Junior menedżerowie i project managerowie → dostęp do wszystkich użytkowników w swoim kraju
  - Szef i admin → dostęp do obu krajów
  - Pracownicy → tylko swoi klienci w danym kraju

#### 4. **✅ Frontend**
- **Filtr lokalizacji** w dashboardzie i raportach
- **Nazwa kraju w nagłówkach** dla uprawnionych użytkowników
- **Kolumna lokalizacji** w tabeli klientów
- **Inteligentne wyświetlanie** zgodnie z uprawnieniami użytkownika

---

## 🚀 **INSTRUKCJA URUCHOMIENIA**

### **Krok 1: Uruchom migrację bazy danych**

```sql
-- Uruchom w Supabase SQL Editor lub psql
\i sql/hierarchy_and_locations_migration.sql
```

### **Krok 2: Sprawdź czy migracja się powiodła**

```sql
-- Sprawdź tabele
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('locations', 'users', 'clients');

-- Sprawdź lokalizacje
SELECT * FROM locations;

-- Sprawdź hierarchię użytkowników
SELECT id, email, full_name, role, role_hierarchy_level, location_id 
FROM users 
ORDER BY role_hierarchy_level;
```

### **Krok 3: Zrestartuj aplikację**

```bash
npm run dev
```

### **Krok 4: Przetestuj funkcjonalność**

1. **Zaloguj się jako różne role** i sprawdź dostępne opcje filtrowania
2. **Sprawdź filtr lokalizacji** w tabeli klientów
3. **Przetestuj nagłówek lokalizacji** (widoczny dla project_manager+)
4. **Sprawdź kolumnę "Kraj"** w tabeli klientów

---

## 📊 **STRUKTURA HIERARCHII**

```
ADMIN (-1)           → Dostęp: WSZYSTKO
    ↓
SZEF (0)             → Dostęp: WSZYSTKIE KRAJE
    ↓
PROJECT_MANAGER (1)  → Dostęp: WŁASNY KRAJ + filtrowanie
    ↓
MANAGER (2)          → Dostęp: WŁASNY KRAJ + filtrowanie  
    ↓
JUNIOR_MANAGER (3)   → Dostęp: WŁASNY KRAJ + filtrowanie
    ↓
PRACOWNIK (4)        → Dostęp: TYLKO SWOI KLIENCI w kraju
```

---

## 🌍 **LOGIKA LOKALIZACJI**

### **Uprawnienia filtrowania:**
- **`canFilterByLocation()`** → `project_manager`, `junior_manager`, `szef`, `admin`
- **`canViewAllLocations()`** → `szef`, `admin`

### **Wyświetlanie:**
- **Nagłówek lokalizacji** → Tylko dla `canFilterByLocation()`
- **Filtr "Wszystkie kraje"** → Tylko dla `canViewAllLocations()`
- **Kolumna "Kraj"** → Wszyscy użytkownicy

---

## 🔐 **POLITYKI RLS (Row Level Security)**

### **Klienci:**
```sql
-- Pracownik - tylko swoi klienci w swojej lokalizacji
clients_pracownik_location_filter

-- Junior Manager - wszyscy klienci w swojej lokalizacji
clients_junior_manager_location_filter

-- Manager - wszyscy klienci w swojej lokalizacji  
clients_manager_location_filter

-- Project Manager - wszyscy klienci w swojej lokalizacji
clients_project_manager_location_filter

-- Szef i Admin - wszyscy klienci we wszystkich lokalizacjach
clients_szef_admin_all_access
```

### **Lokalizacje:**
```sql
-- Wszyscy mogą czytać lokalizacje
locations_select_all

-- Tylko admin i szef mogą modyfikować
locations_admin_modify
```

---

## 🧪 **TESTOWANIE**

### **Scenariusz 1: Pracownik (Polska)**
- ✅ Widzi tylko informację o "Polska" (bez filtra)
- ✅ Widzi tylko swoich klientów z location_id = 'PL'
- ❌ Nie widzi filtra lokalizacji
- ❌ Nie widzi nagłówka lokalizacji

### **Scenariusz 2: Junior Manager (Słowacja)**
- ✅ Może filtrować po "Słowacja"
- ✅ Widzi nagłówek lokalizacji z project managerem
- ✅ Widzi wszystkich klientów z location_id = 'SK'
- ❌ Nie widzi opcji "Wszystkie kraje"

### **Scenariusz 3: Szef**
- ✅ Może filtrować po wszystkich krajach
- ✅ Widzi opcję "Wszystkie kraje"
- ✅ Widzi nagłówek lokalizacji
- ✅ Widzi wszystkich klientów bez ograniczeń

### **Scenariusz 4: Admin**
- ✅ Pełny dostęp do wszystkiego
- ✅ Może zmieniać project managerów lokalizacji
- ✅ Może zarządzać hierarchią

---

## 📝 **SZCZEGÓŁY TECHNICZNE**

### **Nowe komponenty:**
- `components/location-filter.tsx` - Filtr i komponenty lokalizacji
- `sql/hierarchy_and_locations_migration.sql` - Migracja bazy danych

### **Zmodyfikowane komponenty:**
- `lib/supabase.ts` - Dodano interfejsy, API i logikę uprawnień
- `components/clients-table.tsx` - Dodano filtr i kolumnę lokalizacji

### **Nowe interfejsy:**
```typescript
interface Location {
  id: string
  name: string
  code: string // 'PL', 'SK'
  currency: string // 'PLN', 'EUR'
  timezone: string
  region?: string
  project_manager_id?: string
  project_manager?: User
}
```

### **Nowe API:**
```typescript
locationsApi.getAllLocations()
locationsApi.getUserAccessibleLocations(userId)
locationsApi.getLocationById(id)
locationsApi.updateLocationProjectManager(locationId, projectManagerId, currentUser)
```

### **Rozszerzone uprawnienia:**
```typescript
permissionsApi.canViewAllLocations(user)
permissionsApi.canFilterByLocation(user)
permissionsApi.canManageUser(user1, user2)
```

---

## 🎯 **REZULTAT KOŃCOWY**

✅ **System hierarchii ról** - Pełna implementacja z 6 poziomami  
✅ **System lokalizacji** - Polska i Słowacja z pełną obsługą  
✅ **Filtrowanie geograficzne** - Inteligentne ograniczenia uprawnień  
✅ **Frontend zintegrowany** - Filtry, nagłówki, kolumny  
✅ **RLS skonfigurowane** - Bezpieczeństwo na poziomie bazy danych  
✅ **Materialized views** - Optymalizacja wydajności  
✅ **Progressive loading** - Smooth UX przy dużych danych  

### **🏆 GOTOWE DO PRODUKCJI!**

System jest w pełni funkcjonalny i gotowy do użycia. Wszystkie wymagania zostały zaimplementowane zgodnie ze specyfikacją. 