-- =====================================================================================
-- WALIDACJA MIGRACJI ORGANIZATIONAL STRUCTURE
-- Uruchom ten skrypt PO wykonaniu migracji w Supabase Dashboard
-- =====================================================================================

-- 🔍 SPRAWDZENIE STRUKTURY BAZY DANYCH
SELECT 
    '=== WALIDACJA MIGRACJI ORGANIZATIONAL STRUCTURE ===' as header,
    now() as timestamp;

-- 1. SPRAWDŹ TABELE
SELECT 
    '1. TABELE' as test_category,
    'locations' as element,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations' AND table_schema = 'public') 
         THEN '✅ OK' ELSE '❌ BRAK' END as status

UNION ALL

-- 2. SPRAWDŹ KOLUMNY W USERS
SELECT 
    '2. KOLUMNY USERS',
    column_name,
    CASE WHEN column_name IN ('location_id', 'manager_id', 'role_hierarchy_level', 'territory', 'start_date', 'is_active') 
         THEN '✅ OK' ELSE '⚠️ ISTNIEJĄCA' END
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
AND column_name IN ('location_id', 'manager_id', 'role_hierarchy_level', 'territory', 'start_date', 'is_active')

UNION ALL

-- 3. SPRAWDŹ NOWE ROLE
SELECT 
    '3. NOWE ROLE',
    enumlabel,
    CASE WHEN enumlabel IN ('project_manager', 'junior_manager') 
         THEN '✅ NOWA' ELSE '⚠️ ISTNIEJĄCA' END
FROM pg_enum pe
JOIN pg_type pt ON pe.enumtypid = pt.oid
WHERE pt.typname = 'user_role'
AND enumlabel IN ('project_manager', 'junior_manager')

UNION ALL

-- 4. SPRAWDŹ FUNKCJE HIERARCHICZNE
SELECT 
    '4. FUNKCJE',
    routine_name,
    CASE WHEN routine_name IN ('get_subordinates', 'is_manager_of', 'get_hierarchy_path', 'validate_hierarchy') 
         THEN '✅ OK' ELSE '❌ NIEOCZEKIWANA' END
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_subordinates', 'is_manager_of', 'get_hierarchy_path', 'validate_hierarchy')

UNION ALL

-- 5. SPRAWDŹ INDEKSY HIERARCHICZNE
SELECT 
    '5. INDEKSY',
    indexname,
    '✅ OK'
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN ('idx_users_location_id', 'idx_users_manager_id', 'idx_users_role_hierarchy_level')

UNION ALL

-- 6. SPRAWDŹ MATERIALIZED VIEW
SELECT 
    '6. MATERIALIZED VIEWS',
    matviewname,
    CASE WHEN matviewname = 'mv_hierarchy_statistics' THEN '✅ OK' ELSE '❌ NIEOCZEKIWANA' END
FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname = 'mv_hierarchy_statistics'

ORDER BY test_category, element;

-- =====================================================================================
-- TESTY FUNKCJONALNOŚCI
-- =====================================================================================

-- TEST 1: Sprawdź hierarchię (czy nie ma cyklicznych odwołań)
SELECT 
    '🔄 TEST HIERARCHII' as test,
    CASE WHEN COUNT(*) = 0 THEN '✅ BRAK PROBLEMÓW' 
         ELSE '❌ ' || COUNT(*) || ' PROBLEMÓW' END as result
FROM validate_hierarchy();

-- TEST 2: Sprawdź dane lokalizacji
SELECT 
    '🌍 TEST LOKALIZACJI' as test,
    'Kraje: ' || string_agg(name || ' (' || code || ')', ', ') as result
FROM locations WHERE is_active = true;

-- TEST 3: Sprawdź dane użytkowników
SELECT 
    '👥 TEST UŻYTKOWNIKÓW' as test,
    'Total: ' || COUNT(*) || 
    ', z lokalizacją: ' || COUNT(location_id) || 
    ', z hierarchią: ' || COUNT(CASE WHEN role_hierarchy_level IS NOT NULL THEN 1 END) ||
    ', aktywni: ' || COUNT(CASE WHEN is_active = true THEN 1 END) as result
FROM users;

-- TEST 4: Sprawdź poziomy hierarchii
SELECT 
    '📊 POZIOMY HIERARCHII' as test,
    'Poziom ' || role_hierarchy_level || ': ' || COUNT(*) || ' osób (' || 
    string_agg(DISTINCT role::text, ', ') || ')' as result
FROM users 
WHERE role_hierarchy_level IS NOT NULL
GROUP BY role_hierarchy_level
ORDER BY role_hierarchy_level;

-- TEST 5: Test funkcji get_subordinates (przykład)
SELECT 
    '🔗 TEST FUNKCJI HIERARCHII' as test,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_subordinates')
        THEN '✅ FUNKCJE DOSTĘPNE'
        ELSE '❌ BRAK FUNKCJI'
    END as result;

-- =====================================================================================
-- PODSUMOWANIE WALIDACJI
-- =====================================================================================

SELECT 
    '🎯 PODSUMOWANIE MIGRACJI' as summary,
    'Migracja ' || 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations')
         AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location_id')
         AND EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_subordinates')
         AND EXISTS (SELECT FROM pg_matviews WHERE matviewname = 'mv_hierarchy_statistics')
        THEN '✅ ZAKOŃCZONA POMYŚLNIE'
        ELSE '❌ NIEKOMPLETNA - SPRAWDŹ BŁĘDY POWYŻEJ'
    END as status;

-- =====================================================================================
-- NASTĘPNE KROKI
-- =====================================================================================

SELECT 
    '📋 NASTĘPNE KROKI' as info,
    'Po pomyślnej walidacji:
    1. Aktualizuj kod aplikacji (TypeScript interfaces)
    2. Zaimplementuj komponenty hierarchii
    3. Przetestuj nowe funkcjonalności
    4. Przeprowadź szkolenie użytkowników
    5. Monitoruj wydajność przez pierwszy tydzień' as steps; 