# 🚀 **PLAN WYKONANIA MIGRACJI - ORGANIZATIONAL STRUCTURE**

## 📊 **Analiza obecnego stanu bazy (wykonana automatycznie)**

### ✅ **Co już istnieje:**
- Tabele: `users`, `employee_stats`, `clients`, `activity_logs`, `employee_statistics`, `activity_logs_archive`, `working_hours`
- Role: `admin`, `szef`, `manager`, `pracownik`
- Kolumny w users: `id`, `email`, `full_name`, `role`, `created_at`, `updated_at`, `avatar_url`, `language`
- Indeksy podstawowe dla activity_logs, employee_statistics, users
- Materialized views: `mv_activity_summary`, `mv_dashboard_summary`, `mv_monthly_employee_stats`

### ❌ **Co trzeba dodać:**
- 🆕 Tabela `locations`
- 🆕 Kolumny w users: `location_id`, `manager_id`, `role_hierarchy_level`, `territory`, `start_date`, `is_active`
- 🆕 Role: `project_manager`, `junior_manager`
- 🆕 Funkcje: `get_subordinates`, `is_manager_of`, `get_hierarchy_path`
- 🆕 Indeksy hierarchiczne
- 🆕 Materialized view: `mv_hierarchy_statistics`
- 🆕 Polityki RLS dla hierarchii

---

## 🎯 **INSTRUKCJE WYKONANIA - KROK PO KROKU**

### **SPOSÓB 1: Wykonanie pełnej migracji (Supabase Dashboard)**

1. **Otwórz Supabase Dashboard → SQL Editor**
2. **Skopiuj zawartość pliku `sql/organizational_structure_migration.sql`**
3. **Wykonaj w całości (zalecane)**

### **SPOSÓB 2: Wykonanie etapami (bezpieczniejsze)**

#### **ETAP 1: Struktura podstawowa**
```sql
-- Skopiuj i wykonaj linie 10-31 z organizational_structure_migration.sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    currency VARCHAR(3) DEFAULT 'EUR',
    timezone VARCHAR(50) DEFAULT 'Europe/Warsaw',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE locations IS 'Tabela krajów/lokalizacji dla struktury organizacyjnej';
-- ... reszta komentarzy

INSERT INTO locations (name, code, currency, timezone) VALUES 
('Polska', 'PL', 'PLN', 'Europe/Warsaw'),
('Słowacja', 'SK', 'EUR', 'Europe/Bratislava');
```

#### **ETAP 2: Rozszerzenie tabeli users**
```sql
-- Skopiuj i wykonaj linie 37-47 z organizational_structure_migration.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_hierarchy_level INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS territory VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

#### **ETAP 3: Nowe role**
```sql
-- Skopiuj i wykonaj linie 55-58 z organizational_structure_migration.sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'junior_manager';
```

#### **ETAP 4: Indeksy wydajnościowe**
```sql
-- Skopiuj i wykonaj linie 64-78 z organizational_structure_migration.sql
CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
-- ... reszta indeksów
```

#### **ETAP 5: Funkcje hierarchiczne**
```sql
-- Skopiuj i wykonaj linie 86-127 z organizational_structure_migration.sql
-- UWAGA: Te funkcje są kluczowe - skopiuj dokładnie naprawiony kod!
```

#### **ETAP 6: Polityki RLS**
```sql
-- Skopiuj i wykonaj linie 133-195 z organizational_structure_migration.sql
-- UWAGA: To zmieni uprawnienia dostępu!
```

#### **ETAP 7: Migracja danych**
```sql
-- Skopiuj i wykonaj linie 201-215 z organizational_structure_migration.sql
-- To ustawi domyślne wartości dla istniejących użytkowników
```

#### **ETAP 8: Materialized views i finalizacja**
```sql
-- Skopiuj i wykonaj linie 221-447 z organizational_structure_migration.sql
-- Materialized views, funkcje raportowania, triggery
```

---

## 🧪 **WALIDACJA PO MIGRACJI**

Po wykonaniu migracji uruchom te zapytania do sprawdzenia:

```sql
-- 1. Sprawdź czy wszystko zostało utworzone
SELECT 
    'Tabela locations' as element,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations') 
         THEN '✅ OK' ELSE '❌ BRAK' END as status

UNION ALL

SELECT 
    'Kolumna location_id',
    CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location_id') 
         THEN '✅ OK' ELSE '❌ BRAK' END

UNION ALL

SELECT 
    'Funkcja get_subordinates',
    CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_subordinates') 
         THEN '✅ OK' ELSE '❌ BRAK' END

UNION ALL

SELECT 
    'Materialized view mv_hierarchy_statistics',
    CASE WHEN EXISTS (SELECT FROM pg_matviews WHERE matviewname = 'mv_hierarchy_statistics') 
         THEN '✅ OK' ELSE '❌ BRAK' END;

-- 2. Sprawdź nowe role
SELECT unnest(enum_range(NULL::user_role)) as dostepne_role;

-- 3. Test funkcji hierarchii
SELECT * FROM validate_hierarchy();

-- 4. Test danych
SELECT 
    COUNT(*) as total_users,
    COUNT(location_id) as users_with_location,
    COUNT(CASE WHEN role_hierarchy_level IS NOT NULL THEN 1 END) as users_with_hierarchy_level
FROM users;
```

---

## ⚠️ **WAŻNE OSTRZEŻENIA**

### **PRZED MIGRACJĄ:**
1. **Zrób backup bazy danych!**
2. **Wykonaj migrację na kopii testowej najpierw**
3. **Upewnij się że aplikacja jest wyłączona podczas migracji**

### **PO MIGRACJI:**
1. **Polityki RLS zmienią dostęp do danych**
2. **Istniejący kod może wymagać aktualizacji**
3. **Sprawdź czy wszystkie testy przechodzą**

### **ROLLBACK (w razie problemów):**
```sql
-- W razie problemów usuń nowe elementy:
DROP MATERIALIZED VIEW IF EXISTS mv_hierarchy_statistics;
DROP FUNCTION IF EXISTS get_subordinates(UUID);
DROP FUNCTION IF EXISTS is_manager_of(UUID, UUID);
DROP FUNCTION IF EXISTS get_hierarchy_path(UUID);
ALTER TABLE users DROP COLUMN IF EXISTS location_id;
ALTER TABLE users DROP COLUMN IF EXISTS manager_id;
-- etc.
```

---

## 🎯 **NASTĘPNE KROKI PO MIGRACJI**

1. **Aktualizuj kod aplikacji** zgodnie z `HIERARCHICAL_ARCHITECTURE_IMPLEMENTATION.md`
2. **Dodaj nowe interfejsy TypeScript**
3. **Zaimplementuj komponenty hierarchii**
4. **Przetestuj nowe funkcjonalności**
5. **Przeszkol użytkowników końcowych**

---

## 📞 **WSPARCIE**

Jeśli napotkasz problemy:
1. Sprawdź logi w Supabase Dashboard
2. Uruchom zapytania walidacyjne
3. Sprawdź czy wszystkie foreign keys są poprawne
4. W razie błędów - użyj procedury rollback

**Status migracji: GOTOWA DO WYKONANIA ✅** 