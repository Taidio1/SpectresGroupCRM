-- =====================================================================================
-- MIGRACJA BAZY DANYCH DO STRUKTURY ORGANIZACYJNEJ
-- Spectres Group CRM - Hierarchia: Szef → Kraje → Project Manager → Junior Manager → Pracownicy
-- =====================================================================================

-- ---------------------------------------------------------------------------------
-- KROK 1: TWORZENIE TABELI LOKALIZACJI (KRAJÓW)
-- ---------------------------------------------------------------------------------

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE, -- 'PL', 'SK'
    currency VARCHAR(3) DEFAULT 'EUR', -- 'PLN', 'EUR'
    timezone VARCHAR(50) DEFAULT 'Europe/Warsaw',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dodaj komentarz do tabeli
COMMENT ON TABLE locations IS 'Tabela krajów/lokalizacji dla struktury organizacyjnej';
COMMENT ON COLUMN locations.name IS 'Nazwa kraju (np. Polska, Słowacja)';
COMMENT ON COLUMN locations.code IS 'Kod kraju (PL, SK)';
COMMENT ON COLUMN locations.currency IS 'Waluta główna kraju';
COMMENT ON COLUMN locations.timezone IS 'Strefa czasowa kraju';

-- Wstaw domyślne kraje
INSERT INTO locations (name, code, currency, timezone) VALUES 
('Polska', 'PL', 'PLN', 'Europe/Warsaw'),
('Słowacja', 'SK', 'EUR', 'Europe/Bratislava');

-- ---------------------------------------------------------------------------------
-- KROK 2: ROZSZERZENIE TABELI USERS O NOWE KOLUMNY
-- ---------------------------------------------------------------------------------

-- Dodaj nowe kolumny do tabeli users
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_hierarchy_level INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS territory VARCHAR(100); -- dodatkowy opis terenu
ALTER TABLE users ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Dodaj komentarze
COMMENT ON COLUMN users.location_id IS 'Lokalizacja użytkownika (kraj)';
COMMENT ON COLUMN users.manager_id IS 'ID przełożonego w hierarchii organizacyjnej';
COMMENT ON COLUMN users.role_hierarchy_level IS 'Poziom w hierarchii: 0=szef, 1=project_manager, 2=junior_manager, 3=pracownik';
COMMENT ON COLUMN users.territory IS 'Opis przypisanego terytorium/regionu';
COMMENT ON COLUMN users.start_date IS 'Data rozpoczęcia pracy';

-- ---------------------------------------------------------------------------------
-- KROK 3: AKTUALIZACJA ENUM RÓL
-- ---------------------------------------------------------------------------------

-- Dodaj nowe role do enum (jeśli nie istnieją)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'junior_manager';

-- ---------------------------------------------------------------------------------
-- KROK 4: INDEKSY DLA WYDAJNOŚCI
-- ---------------------------------------------------------------------------------

-- Indeks dla location_id (często używane w filtracji)
CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);

-- Indeks dla manager_id (hierarchia organizacyjna)
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- Indeks dla role_hierarchy_level (szybkie filtrowanie według poziomu)
CREATE INDEX IF NOT EXISTS idx_users_role_hierarchy_level ON users(role_hierarchy_level);

-- Złożony indeks dla location + role (często używane razem)
CREATE INDEX IF NOT EXISTS idx_users_location_role ON users(location_id, role);

-- Indeks dla aktywnych użytkowników
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Indeksy dla employee_statistics (wydajność raportów)
CREATE INDEX IF NOT EXISTS idx_employee_stats_user_period ON employee_statistics(user_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_employee_stats_period_active ON employee_statistics(period_start, period_end) WHERE is_active = true;

-- Indeks dla activity_logs (często używane w filtracji)
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_changed_by_timestamp ON activity_logs(changed_by, timestamp DESC);

-- ---------------------------------------------------------------------------------
-- KROK 5: FUNKCJE POMOCNICZE DLA HIERARCHII
-- ---------------------------------------------------------------------------------

-- Funkcja do pobierania wszystkich podwładnych użytkownika (rekurencyjnie)
CREATE OR REPLACE FUNCTION get_subordinates(manager_uuid UUID)
RETURNS TABLE(user_id UUID, level INTEGER) AS $$
WITH RECURSIVE subordinates AS (
    -- Bezpośredni podwładni
    SELECT u.id as user_id, 1 as level
    FROM users u
    WHERE u.manager_id = manager_uuid
    AND u.is_active = true
    
    UNION ALL
    
    -- Rekurencyjnie wszyscy podwładni
    SELECT u.id as user_id, s.level + 1
    FROM users u
    INNER JOIN subordinates s ON u.manager_id = s.user_id
    WHERE u.is_active = true
)
SELECT user_id, level FROM subordinates;
$$ LANGUAGE SQL;

-- Funkcja do sprawdzania czy user A jest przełożonym user B
CREATE OR REPLACE FUNCTION is_manager_of(manager_uuid UUID, subordinate_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM get_subordinates(manager_uuid) 
        WHERE user_id = subordinate_uuid
    );
END;
$$ LANGUAGE plpgsql;

-- Funkcja do pobierania scieżki hierarchii dla użytkownika
CREATE OR REPLACE FUNCTION get_hierarchy_path(user_uuid UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, role user_role, level INTEGER) AS $$
WITH RECURSIVE hierarchy AS (
    -- Rozpocznij od danego użytkownika
    SELECT u.id, u.full_name, u.role, u.role_hierarchy_level, u.manager_id, 0 as path_level
    FROM users u
    WHERE u.id = user_uuid
    
    UNION ALL
    
    -- Idź w górę hierarchii (znajdź managera aktualnej osoby)
    SELECT u.id, u.full_name, u.role, u.role_hierarchy_level, u.manager_id, h.path_level + 1    FROM users u
    INNER JOIN hierarchy h ON u.id = h.manager_id
    WHERE u.is_active = true
)
SELECT id as user_id, full_name, role, path_level as level FROM hierarchy ORDER BY path_level DESC;
$$ LANGUAGE SQL;

-- ---------------------------------------------------------------------------------
-- KROK 6: POLITYKI RLS DLA NOWEJ STRUKTURY
-- ---------------------------------------------------------------------------------

-- Usuń stare polityki jeśli istnieją
DROP POLICY IF EXISTS employees_can_view_own_stats ON employee_statistics;
DROP POLICY IF EXISTS managers_can_view_subordinate_stats ON employee_statistics;
DROP POLICY IF EXISTS hierarchy_based_access ON users;

-- Polityka dla employee_statistics - hierarchiczna kontrola dostępu
CREATE POLICY hierarchy_employee_stats_access ON employee_statistics
FOR SELECT TO authenticated
USING (
    -- Szef widzi wszystko
    (SELECT role FROM users WHERE id = auth.uid()) = 'szef'
    OR
    -- Admin widzi wszystko
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR
    -- Project Manager widzi swoich podwładnych
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'project_manager'
        AND user_id IN (
            SELECT user_id FROM get_subordinates(auth.uid())
            UNION SELECT auth.uid() -- i siebie
        )
    )
    OR
    -- Junior Manager widzi swoich bezpośrednich podwładnych
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'junior_manager'
        AND (
            user_id = auth.uid() -- siebie
            OR user_id IN (
                SELECT id FROM users 
                WHERE manager_id = auth.uid() AND role = 'pracownik'
            )
        )
    )
    OR
    -- Pracownik widzi tylko siebie
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'pracownik'
        AND user_id = auth.uid()
    )
);

-- Polityka dla users - hierarchiczny dostęp do danych użytkowników
CREATE POLICY hierarchy_users_access ON users
FOR SELECT TO authenticated
USING (
    -- Szef i Admin widzą wszystkich
    (SELECT role FROM users WHERE id = auth.uid()) IN ('szef', 'admin')
    OR
    -- Project Manager widzi swoich podwładnych
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'project_manager'
        AND (
            id = auth.uid() -- siebie
            OR id IN (SELECT user_id FROM get_subordinates(auth.uid()))
        )
    )
    OR
    -- Junior Manager widzi siebie i swoich bezpośrednich podwładnych
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'junior_manager'
        AND (
            id = auth.uid() -- siebie
            OR (manager_id = auth.uid() AND role = 'pracownik')
        )
    )
    OR
    -- Pracownik widzi tylko siebie
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'pracownik'
        AND id = auth.uid()
    )
);

-- ---------------------------------------------------------------------------------
-- KROK 7: MIGRACJA DANYCH DO NOWEJ STRUKTURY
-- ---------------------------------------------------------------------------------

-- Ustaw domyślne lokalizacje na podstawie istniejących danych
-- (możesz dostosować logikę według swoich potrzeb)
UPDATE users 
SET location_id = (SELECT id FROM locations WHERE code = 'PL') 
WHERE location_id IS NULL;

-- Ustaw poziomy hierarchii dla istniejących ról
UPDATE users SET role_hierarchy_level = 
    CASE 
        WHEN role = 'szef' THEN 0
        WHEN role = 'admin' THEN 0
        WHEN role = 'project_manager' THEN 1
        WHEN role = 'manager' THEN 1  -- istniejący manager = project_manager
        WHEN role = 'junior_manager' THEN 2
        WHEN role = 'pracownik' THEN 3
        ELSE 3
    END;

-- Ustaw start_date na created_at dla istniejących użytkowników
UPDATE users SET start_date = created_at::date WHERE start_date IS NULL;

-- ---------------------------------------------------------------------------------
-- KROK 8: MATERIALIZED VIEWS DLA WYDAJNOŚCI
-- ---------------------------------------------------------------------------------

-- Widok zmaterializowany dla statystyk hierarchicznych
CREATE MATERIALIZED VIEW mv_hierarchy_statistics AS
WITH hierarchy_data AS (
    SELECT 
        u.id,
        u.full_name,
        u.role,
        u.role_hierarchy_level,
        u.location_id,
        l.name as location_name,
        l.code as location_code,
        u.manager_id,
        m.full_name as manager_name,
        (SELECT COUNT(*) FROM get_subordinates(u.id)) as subordinates_count
    FROM users u
    LEFT JOIN locations l ON u.location_id = l.id
    LEFT JOIN users m ON u.manager_id = m.id
    WHERE u.is_active = true
)
SELECT * FROM hierarchy_data;

-- Indeks dla materializovaného widoku
CREATE INDEX ON mv_hierarchy_statistics(location_id, role_hierarchy_level);
CREATE INDEX ON mv_hierarchy_statistics(manager_id);

-- ---------------------------------------------------------------------------------
-- KROK 9: FUNKCJE DO RAPORTOWANIA
-- ---------------------------------------------------------------------------------

-- Funkcja do pobrania statystyk dla managera (i jego zespołu)
CREATE OR REPLACE FUNCTION get_team_statistics(manager_uuid UUID, period_start DATE, period_end DATE)
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    role user_role,
    location_name TEXT,
    total_clients INTEGER,
    total_sales INTEGER,
    total_revenue NUMERIC,
    efficiency_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.role,
        l.name,
        COALESCE(SUM(es.clients_count), 0)::INTEGER,
        COALESCE(SUM(es.status_sale), 0)::INTEGER,
        COALESCE(SUM(es.total_payments_eur), 0),
        COALESCE(AVG(es.efficiency_percentage), 0)
    FROM users u
    LEFT JOIN locations l ON u.location_id = l.id
    LEFT JOIN employee_statistics es ON u.id = es.user_id 
        AND es.period_start >= period_start 
        AND es.period_end <= period_end
    WHERE u.id = manager_uuid 
       OR u.id IN (SELECT user_id FROM get_subordinates(manager_uuid))
    GROUP BY u.id, u.full_name, u.role, l.name
    ORDER BY u.role_hierarchy_level, u.full_name;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do pobrania statystyk lokalizacji
CREATE OR REPLACE FUNCTION get_location_summary(location_uuid UUID, period_start DATE, period_end DATE)
RETURNS TABLE(
    total_employees INTEGER,
    total_clients INTEGER,
    total_sales INTEGER,
    total_revenue NUMERIC,
    avg_efficiency NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id)::INTEGER,
        COALESCE(SUM(es.clients_count), 0)::INTEGER,
        COALESCE(SUM(es.status_sale), 0)::INTEGER,
        COALESCE(SUM(es.total_payments_eur), 0),
        COALESCE(AVG(es.efficiency_percentage), 0)
    FROM users u
    LEFT JOIN employee_statistics es ON u.id = es.user_id 
        AND es.period_start >= period_start 
        AND es.period_end <= period_end
    WHERE u.location_id = location_uuid 
      AND u.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- KROK 10: TRIGGER DO AKTUALIZACJI MATERIALIZED VIEW
-- ---------------------------------------------------------------------------------

-- Funkcja triggera
CREATE OR REPLACE FUNCTION refresh_hierarchy_statistics()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_hierarchy_statistics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger na zmiany w users
CREATE TRIGGER trigger_refresh_hierarchy_stats
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_hierarchy_statistics();

-- ---------------------------------------------------------------------------------
-- KROK 11: WALIDACJA STRUKTURY
-- ---------------------------------------------------------------------------------

-- Sprawdź czy hierarchia jest prawidłowa (brak cyklicznych odwołań)
CREATE OR REPLACE FUNCTION validate_hierarchy()
RETURNS TABLE(user_id UUID, issue TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Sprawdź cykliczne odwołania
    WITH RECURSIVE cycle_check AS (
        SELECT id, manager_id, ARRAY[id] as path, false as cycle
        FROM users
        WHERE manager_id IS NOT NULL
        
        UNION ALL
        
        SELECT u.id, u.manager_id, path || u.id, u.id = ANY(path)
        FROM users u
        JOIN cycle_check cc ON u.id = cc.manager_id
        WHERE NOT cc.cycle AND u.manager_id IS NOT NULL
    )
    SELECT cc.id as user_id, 'Cykliczne odwołanie w hierarchii'::TEXT
    FROM cycle_check cc
    WHERE cc.cycle
    
    UNION ALL
    
    -- Sprawdź czy poziom hierarchii odpowiada roli
    SELECT u.id, 'Nieprawidłowy poziom hierarchii dla roli'::TEXT
    FROM users u
    WHERE (
        (u.role = 'szef' AND u.role_hierarchy_level != 0) OR
        (u.role = 'admin' AND u.role_hierarchy_level != 0) OR
        (u.role = 'project_manager' AND u.role_hierarchy_level != 1) OR
        (u.role = 'junior_manager' AND u.role_hierarchy_level != 2) OR
        (u.role = 'pracownik' AND u.role_hierarchy_level != 3)
    );
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- KROK 12: PRZYKŁADOWE ZAPYTANIA DLA RÓŻNYCH RÓL
-- ---------------------------------------------------------------------------------

/*
-- SZEF - widzi całość
SELECT * FROM get_team_statistics(
    (SELECT id FROM users WHERE role = 'szef' LIMIT 1),
    '2024-01-01',
    '2024-12-31'
);

-- PROJECT MANAGER - widzi swoich podwładnych  
SELECT * FROM get_team_statistics(
    'project_manager_uuid',
    '2024-01-01', 
    '2024-12-31'
);

-- STATYSTYKI LOKALIZACJI
SELECT * FROM get_location_summary(
    (SELECT id FROM locations WHERE code = 'PL'),
    '2024-01-01',
    '2024-12-31'
);

-- WALIDACJA HIERARCHII
SELECT * FROM validate_hierarchy();
*/

-- ---------------------------------------------------------------------------------
-- ZAKOŃCZENIE MIGRACJI
-- ---------------------------------------------------------------------------------

-- Odśwież materialized view
REFRESH MATERIALIZED VIEW mv_hierarchy_statistics;

-- Podsumowanie
SELECT 
    'Migracja zakończona pomyślnie' as status,
    (SELECT COUNT(*) FROM locations) as locations_count,
    (SELECT COUNT(*) FROM users WHERE location_id IS NOT NULL) as users_with_location,
    (SELECT COUNT(*) FROM users WHERE manager_id IS NOT NULL) as users_with_manager,
    (SELECT COUNT(*) FROM validate_hierarchy()) as hierarchy_issues; 