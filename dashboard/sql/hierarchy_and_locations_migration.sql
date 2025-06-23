-- ===============================================
-- HIERARCHICAL ROLE & LOCATION SYSTEM MIGRATION
-- ===============================================
-- Implementacja systemu hierarchii ról i lokalizacji
-- zgodnie z wymaganiami CRM Spectres Group

-- 1. TWORZENIE TABELI LOKALIZACJI
-- ===============================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- 'PL', 'SK'
    currency TEXT NOT NULL, -- 'PLN', 'EUR'
    timezone TEXT NOT NULL, -- 'Europe/Warsaw', 'Europe/Bratislava'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Dodaj brakujące kolumny jeśli nie istnieją
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS region TEXT, -- opcjonalne
ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES users(id); -- project manager dla lokalizacji

-- 2. INSEROWANIE DOMYŚLNYCH LOKALIZACJI
-- ===============================================
-- Bezpieczne wstawianie - sprawdź czy już istnieją
DO $$
BEGIN
    -- Dodaj Polskę jeśli nie istnieje
    IF NOT EXISTS (SELECT 1 FROM locations WHERE code = 'PL') THEN
        INSERT INTO locations (name, code, currency, timezone, region) 
        VALUES ('Polska', 'PL', 'PLN', 'Europe/Warsaw', 'Central Europe');
        RAISE NOTICE 'Dodano lokalizację: Polska';
    ELSE
        RAISE NOTICE 'Lokalizacja Polska już istnieje';
    END IF;
    
    -- Dodaj Słowację jeśli nie istnieje
    IF NOT EXISTS (SELECT 1 FROM locations WHERE code = 'SK') THEN
        INSERT INTO locations (name, code, currency, timezone, region) 
        VALUES ('Słowacja', 'SK', 'EUR', 'Europe/Bratislava', 'Central Europe');
        RAISE NOTICE 'Dodano lokalizację: Słowacja';
    ELSE
        RAISE NOTICE 'Lokalizacja Słowacja już istnieje';
    END IF;
END $$;

-- 3. ROZSZERZENIE TABELI USERS
-- ===============================================
-- Dodanie kolumn hierarchicznych (jeśli nie istnieją)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id),
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS role_hierarchy_level INTEGER,
ADD COLUMN IF NOT EXISTS territory TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. ROZSZERZENIE TABELI CLIENTS
-- ===============================================
-- Dodanie kolumny location_id do klientów
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- 5. TWORZENIE TYPU ENUM DLA RÓL (jeśli nie istnieje)
-- ===============================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'admin', 
        'szef', 
        'project_manager', 
        'manager', 
        'junior_manager', 
        'pracownik'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. AKTUALIZACJA POZIOMÓW HIERARCHII
-- ===============================================
-- Ustaw role_hierarchy_level zgodnie z hierarchią
UPDATE users SET role_hierarchy_level = 
    CASE role
        WHEN 'admin' THEN -1
        WHEN 'szef' THEN 0
        WHEN 'project_manager' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'junior_manager' THEN 3
        WHEN 'pracownik' THEN 4
        ELSE 99 -- nieznana rola
    END
WHERE role_hierarchy_level IS NULL;

-- 7. DOMYŚLNE PRZYPISANIE LOKALIZACJI
-- ===============================================
-- Przypisz wszystkich użytkowników do Polski jako domyślne
UPDATE users 
SET location_id = (SELECT id FROM locations WHERE code = 'PL' LIMIT 1)
WHERE location_id IS NULL;

-- Przypisz wszystkich klientów do Polski jako domyślne
UPDATE clients 
SET location_id = (SELECT id FROM locations WHERE code = 'PL' LIMIT 1)
WHERE location_id IS NULL;

-- 8. TWORZENIE INDEKSÓW WYDAJNOŚCI
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_role_hierarchy ON users(role_hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_clients_location_id ON clients(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);

-- 9. POLITYKI RLS DLA LOKALIZACJI
-- ===============================================

-- Polityki dla tabeli locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Wszyscy mogą czytać lokalizacje
CREATE POLICY locations_select_all ON locations 
FOR SELECT TO authenticated USING (true);

-- Tylko admin i szef mogą modyfikować lokalizacje
CREATE POLICY locations_admin_modify ON locations 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'szef')
    )
);

-- 10. ZAKTUALIZOWANE POLITYKI RLS DLA CLIENTS
-- ===============================================

-- Usuń stare polityki jeśli istnieją
DROP POLICY IF EXISTS pracownik_clients_select ON clients;
DROP POLICY IF EXISTS manager_szef_clients_select ON clients;
DROP POLICY IF EXISTS admin_clients_select ON clients;

-- Nowe polityki z uwzględnieniem lokalizacji

-- Pracownik - widzi tylko swoich klientów w swojej lokalizacji
CREATE POLICY clients_pracownik_location_filter ON clients 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'pracownik'
        AND users.location_id = clients.location_id
        AND (clients.owner_id = auth.uid() OR clients.owner_id IS NULL OR clients.edited_by = auth.uid())
    )
);

-- Junior Manager - widzi wszystkich klientów w swojej lokalizacji
CREATE POLICY clients_junior_manager_location_filter ON clients 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'junior_manager'
        AND users.location_id = clients.location_id
    )
);

-- Manager - widzi wszystkich klientów w swojej lokalizacji
CREATE POLICY clients_manager_location_filter ON clients 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'manager'
        AND users.location_id = clients.location_id
    )
);

-- Project Manager - widzi wszystkich klientów w swojej lokalizacji
CREATE POLICY clients_project_manager_location_filter ON clients 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'project_manager'
        AND users.location_id = clients.location_id
    )
);

-- Szef i Admin - widzą wszystkich klientów we wszystkich lokalizacjach
CREATE POLICY clients_szef_admin_all_access ON clients 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('szef', 'admin')
    )
);

-- 11. POLITYKI INSERT/UPDATE/DELETE DLA CLIENTS
-- ===============================================

-- Wszyscy uwierzytelnieni mogą dodawać klientów (do swojej lokalizacji)
CREATE POLICY clients_insert_own_location ON clients 
FOR INSERT TO authenticated 
WITH CHECK (
    location_id = (
        SELECT location_id FROM users WHERE id = auth.uid()
    )
);

-- Update - zgodnie z tymi samymi regułami co SELECT
CREATE POLICY clients_update_same_as_select ON clients 
FOR UPDATE TO authenticated 
USING (
    -- Pracownik - tylko swoi klienci w swojej lokalizacji
    (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'pracownik'
        AND users.location_id = clients.location_id
        AND (clients.owner_id = auth.uid() OR clients.owner_id IS NULL OR clients.edited_by = auth.uid())
    )) OR
    -- Junior Manager, Manager, Project Manager - wszyscy w swojej lokalizacji
    (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('junior_manager', 'manager', 'project_manager')
        AND users.location_id = clients.location_id
    )) OR
    -- Szef i Admin - wszyscy
    (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('szef', 'admin')
    ))
);

-- Delete - tylko Manager+ w swojej lokalizacji lub Szef/Admin wszędzie
CREATE POLICY clients_delete_managers_plus ON clients 
FOR DELETE TO authenticated 
USING (
    -- Manager, Project Manager, Junior Manager - swoją lokalizację
    (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('manager', 'project_manager', 'junior_manager')
        AND users.location_id = clients.location_id
    )) OR
    -- Szef i Admin - wszędzie
    (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('szef', 'admin')
    ))
);

-- 12. FUNKCJE POMOCNICZE
-- ===============================================

-- Funkcja sprawdzająca czy użytkownik może widzieć lokalizację
CREATE OR REPLACE FUNCTION user_can_access_location(user_id UUID, location_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = user_id
        AND (
            u.role IN ('szef', 'admin') OR -- Szef i admin widzą wszystko
            u.location_id = location_id    -- Inni tylko swoją lokalizację
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja pobierająca dostępne lokalizacje dla użytkownika
CREATE OR REPLACE FUNCTION get_user_accessible_locations(user_id UUID)
RETURNS TABLE(id UUID, name TEXT, code TEXT, currency TEXT, timezone TEXT) AS $$
BEGIN
    -- Sprawdź rolę użytkownika
    IF EXISTS (SELECT 1 FROM users WHERE users.id = user_id AND role IN ('szef', 'admin')) THEN
        -- Szef i admin widzą wszystkie lokalizacje
        RETURN QUERY SELECT l.id, l.name, l.code, l.currency, l.timezone FROM locations l;
    ELSE
        -- Pozostali widzą tylko swoją lokalizację
        RETURN QUERY 
        SELECT l.id, l.name, l.code, l.currency, l.timezone 
        FROM locations l
        JOIN users u ON u.location_id = l.id
        WHERE u.id = user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. MATERIALIZED VIEW DLA WYDAJNOŚCI
-- ===============================================

-- Widok z użytkownikami i ich hierarchią
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_hierarchy AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.role_hierarchy_level,
    u.location_id,
    u.manager_id,
    l.name as location_name,
    l.code as location_code,
    m.full_name as manager_name,
    COUNT(c.id) as clients_count
FROM users u
LEFT JOIN locations l ON u.location_id = l.id
LEFT JOIN users m ON u.manager_id = m.id
LEFT JOIN clients c ON c.owner_id = u.id
GROUP BY u.id, u.email, u.full_name, u.role, u.role_hierarchy_level, 
         u.location_id, u.manager_id, l.name, l.code, m.full_name;

-- Indeks dla materialized view
CREATE UNIQUE INDEX IF NOT EXISTS mv_user_hierarchy_id_idx ON mv_user_hierarchy(id);
CREATE INDEX IF NOT EXISTS mv_user_hierarchy_location_idx ON mv_user_hierarchy(location_id);
CREATE INDEX IF NOT EXISTS mv_user_hierarchy_role_idx ON mv_user_hierarchy(role);

-- 14. TRIGGER DO ODŚWIEŻANIA MATERIALIZED VIEW
-- ===============================================

-- Funkcja odświeżająca widok
CREATE OR REPLACE FUNCTION refresh_user_hierarchy_mv()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_hierarchy;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggery do automatycznego odświeżania
DROP TRIGGER IF EXISTS trigger_refresh_user_hierarchy_users ON users;
DROP TRIGGER IF EXISTS trigger_refresh_user_hierarchy_clients ON clients;

CREATE TRIGGER trigger_refresh_user_hierarchy_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_user_hierarchy_mv();

CREATE TRIGGER trigger_refresh_user_hierarchy_clients
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_user_hierarchy_mv();

-- 15. KOMENTARZE DOKUMENTACYJNE
-- ===============================================

COMMENT ON TABLE locations IS 'Tabela lokalizacji/krajów dla systemu CRM';
COMMENT ON COLUMN locations.code IS 'Kod kraju (PL, SK)';
COMMENT ON COLUMN locations.project_manager_id IS 'Project Manager odpowiedzialny za lokalizację';

COMMENT ON COLUMN users.role_hierarchy_level IS 'Poziom hierarchii: admin=-1, szef=0, project_manager=1, manager=2, junior_manager=3, pracownik=4';
COMMENT ON COLUMN users.location_id IS 'Lokalizacja/kraj użytkownika';
COMMENT ON COLUMN users.manager_id IS 'Bezpośredni przełożony';

COMMENT ON COLUMN clients.location_id IS 'Lokalizacja/kraj klienta';

-- Końcowa informacja o sukcesie
DO $$
BEGIN
    RAISE NOTICE 'HIERARCHY & LOCATION MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE 'Created: locations table, hierarchy levels, RLS policies';
    RAISE NOTICE 'Next: Update application code to use new location filtering';
END $$; 