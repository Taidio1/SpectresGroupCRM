-- DIAGNOZA I NAPRAWA PROBLEMU "NIEZNANY PRACOWNIK"

-- 1. Sprawdź wszystkie rekordy w employee_stats
SELECT 
    es.id,
    es.user_id,
    es.custom_clients_count,
    es.custom_total_payments,
    'employee_stats record' as source
FROM employee_stats es
ORDER BY es.created_at;

-- 2. Sprawdź wszystkich użytkowników z rolą pracownik
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.role,
    'users record' as source
FROM users u
WHERE u.role = 'pracownik'
ORDER BY u.full_name;

-- 3. Sprawdź JOIN - które rekordy employee_stats nie mają odpowiadających użytkowników
SELECT 
    es.id as stats_id,
    es.user_id,
    u.id as user_id_found,
    u.full_name,
    u.email,
    u.role,
    CASE 
        WHEN u.id IS NULL THEN 'BRAK UŻYTKOWNIKA'
        WHEN u.role != 'pracownik' THEN 'INNA ROLA: ' || u.role
        ELSE 'OK'
    END as status
FROM employee_stats es
LEFT JOIN users u ON es.user_id = u.id
ORDER BY status DESC, u.full_name;

-- 4. Sprawdź które użytkownicy-pracownicy nie mają statystyk
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.role,
    es.id as stats_id,
    CASE 
        WHEN es.id IS NULL THEN 'BRAK STATYSTYK'
        ELSE 'MA STATYSTYKI'
    END as status
FROM users u
LEFT JOIN employee_stats es ON u.id = es.user_id
WHERE u.role = 'pracownik'
ORDER BY status DESC, u.full_name;

-- 5. NAPRAWA: Usuń rekordy employee_stats które nie mają odpowiadających użytkowników
DELETE FROM employee_stats 
WHERE user_id NOT IN (SELECT id FROM users);

-- 6. NAPRAWA: Dodaj brakujące rekordy dla pracowników którzy nie mają statystyk
INSERT INTO employee_stats (
    user_id, 
    daily_target, 
    commission_rate,
    custom_clients_count,
    custom_total_payments
)
SELECT 
    u.id,
    20, -- default target
    3.0, -- default commission rate for pracownik
    0, -- default clients count
    0.00 -- default payments
FROM users u
WHERE u.role = 'pracownik'
AND u.id NOT IN (SELECT user_id FROM employee_stats)
ON CONFLICT (user_id) DO NOTHING;

-- 7. NAPRAWA: Usuń rekordy dla użytkowników którzy nie są pracownikami (jeśli chcesz tylko pracowników)
-- UWAGA: Odkomentuj tylko jeśli chcesz usunąć statystyki dla manager/szef/admin
-- DELETE FROM employee_stats 
-- WHERE user_id IN (
--     SELECT u.id FROM users u 
--     WHERE u.role != 'pracownik'
-- );

-- 8. Sprawdź wynik po naprawie
SELECT 
    es.id,
    es.user_id,
    u.full_name,
    u.email,
    u.role,
    es.custom_clients_count,
    es.custom_total_payments,
    es.commission_rate
FROM employee_stats es
JOIN users u ON es.user_id = u.id
WHERE u.role = 'pracownik'
ORDER BY u.full_name;

-- 9. Sprawdź czy są jakieś "osierocone" rekordy
SELECT 
    COUNT(*) as total_employee_stats,
    COUNT(u.id) as with_valid_users,
    COUNT(*) - COUNT(u.id) as orphaned_records
FROM employee_stats es
LEFT JOIN users u ON es.user_id = u.id; 