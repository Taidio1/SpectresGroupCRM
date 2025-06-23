-- =====================================================================================
-- TEST MIGRACJI KROK 1 - ORGANIZATIONAL STRUCTURE
-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor
-- =====================================================================================

-- SPRAWDŹ CZY TABELA LOCATIONS ISTNIEJE
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'locations'
) as locations_exists;

-- SPRAWDŹ CZY NOWE KOLUMNY W USERS ISTNIEJĄ
SELECT 
    EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location_id') as location_id_exists,
    EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'manager_id') as manager_id_exists,
    EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_hierarchy_level') as role_hierarchy_level_exists;

-- SPRAWDŹ AKTUALNY ENUM user_role
SELECT unnest(enum_range(NULL::user_role)) as current_roles;

-- SPRAWDŹ ISTNIEJĄCE INDEKSY
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'employee_statistics', 'activity_logs')
ORDER BY tablename, indexname; 