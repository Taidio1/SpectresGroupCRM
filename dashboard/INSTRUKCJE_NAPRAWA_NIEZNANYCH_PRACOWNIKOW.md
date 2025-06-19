# NAPRAWA PROBLEMU "NIEZNANY PRACOWNIK"

## Problem
W tabeli statystyk pracowników pojawiają się rekordy "Nieznany pracownik", co oznacza, że w bazie danych są rekordy w tabeli `employee_stats` które nie mają odpowiadających użytkowników w tabeli `users`.

## Rozwiązanie

### 1. Diagnoza w Supabase SQL Editor

Wykonaj poniższe zapytania w kolejności w SQL Editor w Supabase:

```sql
-- 1. Sprawdź wszystkie rekordy w employee_stats
SELECT 
    es.id,
    es.user_id,
    es.custom_clients_count,
    es.custom_total_payments,
    'employee_stats record' as source
FROM employee_stats es
ORDER BY es.created_at;

-- 2. Sprawdź JOIN - które rekordy employee_stats nie mają odpowiadających użytkowników
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
```

### 2. Naprawa danych

```sql
-- NAPRAWA: Usuń rekordy employee_stats które nie mają odpowiadających użytkowników
DELETE FROM employee_stats 
WHERE user_id NOT IN (SELECT id FROM users);

-- NAPRAWA: Dodaj brakujące rekordy dla pracowników którzy nie mają statystyk
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
```

### 3. Weryfikacja

```sql
-- Sprawdź wynik po naprawie
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

-- Sprawdź czy są jakieś "osierocone" rekordy
SELECT 
    COUNT(*) as total_employee_stats,
    COUNT(u.id) as with_valid_users,
    COUNT(*) - COUNT(u.id) as orphaned_records
FROM employee_stats es
LEFT JOIN users u ON es.user_id = u.id;
```

### 4. Kod aplikacji już naprawiony

Kod aplikacji został już zaktualizowany w `components/reports.tsx` aby:
- Filtrować tylko rekordy z prawidłowymi danymi użytkownika
- Nie pokazywać "nieznanych pracowników"

## Wynik

Po wykonaniu powyższych kroków:
1. Usunięte będą wszystkie "osierocone" rekordy statystyk
2. Dodane będą brakujące rekordy dla wszystkich pracowników
3. Aplikacja będzie pokazywała tylko prawidłowych pracowników
4. Nie będą się już pojawiać "Nieznany pracownik" rekordy

## Uwagi

- **WAŻNE**: Wykonaj backup bazy danych przed uruchomieniem DELETE!
- Jeśli chcesz zachować statystyki dla manager/szef/admin, zostaw je w tabeli
- Domyślne wartości (20 target, 3% prowizja) możesz dostosować do swoich potrzeb 