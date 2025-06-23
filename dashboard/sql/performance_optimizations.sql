-- =====================================================================================
-- OPTYMALIZACJE WYDAJNOŚCI DLA STRUKTURY HIERARCHICZNEJ
-- Spectres Group CRM - Indeksy, partycjonowanie i optymalizacje zapytań
-- =====================================================================================

-- ---------------------------------------------------------------------------------
-- 1. DODATKOWE INDEKSY DLA WYDAJNOŚCI RAPORTÓW
-- ---------------------------------------------------------------------------------

-- Indeksy dla częstych kombinacji filtrów w employee_statistics
CREATE INDEX IF NOT EXISTS idx_employee_stats_composite_reporting 
ON employee_statistics(user_id, period_type, period_start DESC, is_active) 
WHERE is_active = true;

-- Indeks dla szybkiego wyszukiwania aktywnych statystyk w bieżącym miesiącu
CREATE INDEX IF NOT EXISTS idx_employee_stats_current_month 
ON employee_statistics(user_id, efficiency_percentage DESC) 
WHERE period_type = 'monthly' 
AND period_start >= date_trunc('month', CURRENT_DATE)
AND is_active = true;

-- Indeksy dla hierarchii użytkowników z lokalizacją
CREATE INDEX IF NOT EXISTS idx_users_hierarchy_location 
ON users(location_id, role_hierarchy_level, is_active) 
WHERE is_active = true;

-- Indeks dla szybkiego wyszukiwania podwładnych
CREATE INDEX IF NOT EXISTS idx_users_manager_role 
ON users(manager_id, role) 
WHERE manager_id IS NOT NULL AND is_active = true;

-- Indeks dla activity_logs z hierarchią czasową
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time 
ON activity_logs(changed_by, timestamp DESC) 
INCLUDE (change_type, field_changed);

-- Indeks dla clients z właścicielem i lokalizacją
CREATE INDEX IF NOT EXISTS idx_clients_owner_location 
ON clients(owner_id) 
INCLUDE (status, edited_at, last_phone_click);

-- ---------------------------------------------------------------------------------
-- 2. PARTYCJONOWANIE TABELI EMPLOYEE_STATISTICS
-- ---------------------------------------------------------------------------------

-- Partycjonowanie po dacie dla lepszej wydajności historycznych raportów
-- (Uwaga: wymaga migracji danych - wykonaj ostrożnie w produkcji)

/*
-- Przykład partycjonowania (nie wykonuj automatycznie)
CREATE TABLE employee_statistics_partitioned (
    LIKE employee_statistics INCLUDING ALL
) PARTITION BY RANGE (period_start);

-- Partycje dla kolejnych lat
CREATE TABLE employee_statistics_2024 PARTITION OF employee_statistics_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE employee_statistics_2025 PARTITION OF employee_statistics_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
*/

-- ---------------------------------------------------------------------------------
-- 3. MATERIALIZED VIEWS DLA CZĘSTYCH RAPORTÓW
-- ---------------------------------------------------------------------------------

-- Szybki widok aktualnych statystyk miesięcznych
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_current_month_stats AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.role,
    u.role_hierarchy_level,
    u.location_id,
    l.name as location_name,
    l.code as country_code,
    u.manager_id,
    m.full_name as manager_name,
    COALESCE(es.status_sale, 0) as monthly_sales,
    COALESCE(es.total_payments_eur, 0) as monthly_revenue,
    COALESCE(es.efficiency_percentage, 0) as efficiency,
    COALESCE(es.monthly_target, 0) as target,
    COALESCE(es.monthly_achieved, 0) as achieved,
    es.last_activity_at,
    es.updated_at as stats_updated_at
FROM users u
LEFT JOIN locations l ON u.location_id = l.id
LEFT JOIN users m ON u.manager_id = m.id
LEFT JOIN employee_statistics es ON u.id = es.user_id 
    AND es.period_type = 'monthly'
    AND es.period_start >= date_trunc('month', CURRENT_DATE)
    AND es.is_active = true
WHERE u.is_active = true
ORDER BY u.role_hierarchy_level, l.name, u.full_name;

-- Indeksy dla materialized view
CREATE INDEX IF NOT EXISTS idx_mv_current_month_location_role 
ON mv_current_month_stats(location_id, role_hierarchy_level);

CREATE INDEX IF NOT EXISTS idx_mv_current_month_manager 
ON mv_current_month_stats(manager_id) 
WHERE manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mv_current_month_efficiency 
ON mv_current_month_stats(efficiency DESC) 
WHERE efficiency > 0;

-- Widok dla rankingu performerów
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_performance_ranking AS
WITH ranked_performance AS (
    SELECT 
        user_id,
        full_name,
        role,
        location_name,
        country_code,
        manager_name,
        monthly_sales,
        monthly_revenue,
        efficiency,
        ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY efficiency DESC) as location_rank,
        ROW_NUMBER() OVER (ORDER BY efficiency DESC) as global_rank,
        CASE 
            WHEN efficiency >= 90 THEN 'Excellent'
            WHEN efficiency >= 75 THEN 'Good'
            WHEN efficiency >= 50 THEN 'Average'
            ELSE 'Needs Improvement'
        END as performance_category
    FROM mv_current_month_stats
    WHERE role = 'pracownik'
)
SELECT * FROM ranked_performance;

-- ---------------------------------------------------------------------------------
-- 4. FUNKCJE CACHE'OWANE DLA CZĘSTYCH OBLICZEŃ
-- ---------------------------------------------------------------------------------

-- Cache dla hierarchii (aktualizowany triggerem)
CREATE TABLE IF NOT EXISTS hierarchy_cache (
    user_id UUID PRIMARY KEY,
    all_subordinates UUID[],
    direct_subordinates_count INTEGER,
    total_subordinates_count INTEGER,
    hierarchy_path TEXT,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- Funkcja do odświeżania cache hierarchii
CREATE OR REPLACE FUNCTION refresh_hierarchy_cache()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Wyczyść stary cache
    TRUNCATE hierarchy_cache;
    
    -- Przebuduj cache dla każdego użytkownika z podwładnymi
    FOR user_record IN 
        SELECT DISTINCT manager_id 
        FROM users 
        WHERE manager_id IS NOT NULL AND is_active = true
    LOOP
        WITH subordinates AS (
            SELECT array_agg(user_id) as all_subs
            FROM get_subordinates(user_record.manager_id)
        ),
        direct_subs AS (
            SELECT COUNT(*) as direct_count
            FROM users 
            WHERE manager_id = user_record.manager_id AND is_active = true
        ),
        hierarchy AS (
            SELECT string_agg(full_name, ' → ' ORDER BY level) as path
            FROM get_hierarchy_path(user_record.manager_id) h
            JOIN users u ON h.user_id = u.id
        )
        INSERT INTO hierarchy_cache (user_id, all_subordinates, direct_subordinates_count, total_subordinates_count, hierarchy_path)
        SELECT 
            user_record.manager_id,
            COALESCE(s.all_subs, ARRAY[]::UUID[]),
            COALESCE(ds.direct_count, 0),
            COALESCE(array_length(s.all_subs, 1), 0),
            h.path
        FROM subordinates s
        CROSS JOIN direct_subs ds
        CROSS JOIN hierarchy h;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 5. OPTYMALIZOWANE ZAPYTANIA DLA DASHBOARDÓW
-- ---------------------------------------------------------------------------------

-- Szybka funkcja dla dashboard głównego (używa materialized views)
CREATE OR REPLACE FUNCTION get_dashboard_quick_stats(user_uuid UUID)
RETURNS TABLE(
    accessible_employees INTEGER,
    total_sales_this_month INTEGER,
    total_revenue_this_month NUMERIC,
    avg_team_efficiency NUMERIC,
    top_performer_name TEXT,
    underperformers_count INTEGER,
    active_employees_today INTEGER
) AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = user_uuid;
    
    RETURN QUERY
    WITH accessible_users AS (
        SELECT user_id 
        FROM mv_current_month_stats 
        WHERE (
            -- Logika dostępu oparta na roli
            user_role IN ('szef', 'admin')
            OR (user_role = 'project_manager' AND (user_id = user_uuid OR manager_id = user_uuid OR user_id IN (SELECT unnest(all_subordinates) FROM hierarchy_cache WHERE user_id = user_uuid)))
            OR (user_role = 'junior_manager' AND (user_id = user_uuid OR manager_id = user_uuid))
            OR (user_role = 'pracownik' AND user_id = user_uuid)
        )
    )
    SELECT 
        COUNT(DISTINCT au.user_id)::INTEGER,
        SUM(cms.monthly_sales)::INTEGER,
        SUM(cms.monthly_revenue),
        AVG(cms.efficiency),
        (SELECT full_name FROM mv_current_month_stats cms2 
         WHERE cms2.user_id IN (SELECT user_id FROM accessible_users) 
         ORDER BY cms2.efficiency DESC LIMIT 1),
        COUNT(CASE WHEN cms.efficiency < 50 THEN 1 END)::INTEGER,
        COUNT(CASE WHEN cms.last_activity_at >= CURRENT_DATE THEN 1 END)::INTEGER
    FROM accessible_users au
    JOIN mv_current_month_stats cms ON au.user_id = cms.user_id;
END;
$$ LANGUAGE plpgsql;

-- Funkcja dla trendów wydajności (z cache)
CREATE OR REPLACE FUNCTION get_performance_trends(user_uuid UUID, months_back INTEGER DEFAULT 6)
RETURNS TABLE(
    month_name TEXT,
    total_sales INTEGER,
    total_revenue NUMERIC,
    avg_efficiency NUMERIC,
    employee_count INTEGER
) AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = user_uuid;
    
    RETURN QUERY
    WITH accessible_users AS (
        SELECT user_id 
        FROM mv_current_month_stats 
        WHERE (
            user_role IN ('szef', 'admin')
            OR (user_role = 'project_manager' AND (user_id = user_uuid OR user_id IN (SELECT unnest(all_subordinates) FROM hierarchy_cache WHERE user_id = user_uuid)))
            OR (user_role = 'junior_manager' AND (user_id = user_uuid OR manager_id = user_uuid))
            OR (user_role = 'pracownik' AND user_id = user_uuid)
        )
    ),
    monthly_trends AS (
        SELECT 
            TO_CHAR(es.period_start, 'YYYY-MM') as month_year,
            es.period_start,
            SUM(es.status_sale) as sales,
            SUM(es.total_payments_eur) as revenue,
            AVG(es.efficiency_percentage) as efficiency,
            COUNT(DISTINCT es.user_id) as emp_count
        FROM employee_statistics es
        JOIN accessible_users au ON es.user_id = au.user_id
        WHERE es.period_type = 'monthly'
          AND es.period_start >= CURRENT_DATE - INTERVAL '1 month' * months_back
          AND es.is_active = true
        GROUP BY es.period_start
        ORDER BY es.period_start DESC
    )
    SELECT month_year, sales::INTEGER, revenue, efficiency, emp_count::INTEGER
    FROM monthly_trends;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 6. TRIGGERY DLA AUTOMATYCZNEGO CACHE MANAGEMENT
-- ---------------------------------------------------------------------------------

-- Trigger do odświeżania materialized views
CREATE OR REPLACE FUNCTION auto_refresh_materialized_views()
RETURNS TRIGGER AS $$
BEGIN
    -- Odśwież tylko w godzinach pracy (optymalizacja)
    IF EXTRACT(HOUR FROM NOW()) BETWEEN 8 AND 18 THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_month_stats;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_performance_ranking;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger na employee_statistics
CREATE TRIGGER trigger_refresh_stats_views
    AFTER INSERT OR UPDATE ON employee_statistics
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_refresh_materialized_views();

-- Trigger do aktualizacji hierarchy cache
CREATE OR REPLACE FUNCTION auto_refresh_hierarchy_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Aktualizuj cache tylko jeśli zmienił się manager_id
    IF (TG_OP = 'UPDATE' AND OLD.manager_id IS DISTINCT FROM NEW.manager_id) 
       OR TG_OP = 'INSERT' THEN
        PERFORM refresh_hierarchy_cache();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger na users
CREATE TRIGGER trigger_refresh_hierarchy_cache
    AFTER INSERT OR UPDATE OF manager_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_refresh_hierarchy_cache();

-- ---------------------------------------------------------------------------------
-- 7. FUNKCJE MAINTENANCE I MONITORING
-- ---------------------------------------------------------------------------------

-- Funkcja do monitorowania wydajności zapytań
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
    table_name TEXT,
    index_usage NUMERIC,
    seq_scan_count BIGINT,
    index_scan_count BIGINT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename,
        CASE 
            WHEN seq_scan + idx_scan > 0 
            THEN round((idx_scan::NUMERIC / (seq_scan + idx_scan) * 100), 2)
            ELSE 0 
        END,
        seq_scan,
        idx_scan,
        CASE 
            WHEN seq_scan > idx_scan AND seq_scan > 1000 
            THEN 'Consider adding indexes - high sequential scan count'
            WHEN idx_scan = 0 AND seq_scan > 100 
            THEN 'No index usage detected - review table structure'
            WHEN seq_scan + idx_scan = 0 
            THEN 'Table not accessed recently'
            ELSE 'Performance OK'
        END
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY seq_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do czyszczenia starych cache'y
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Wyczyść stare rekordy cache starsze niż 7 dni
    DELETE FROM hierarchy_cache 
    WHERE last_updated < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Przebuduj cache
    PERFORM refresh_hierarchy_cache();
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do archiwizacji starych statystyk
CREATE OR REPLACE FUNCTION archive_old_statistics(months_to_keep INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Przenieś stare statystyki do tabeli archiwum
    WITH old_stats AS (
        DELETE FROM employee_statistics 
        WHERE period_start < CURRENT_DATE - INTERVAL '1 month' * months_to_keep
        AND period_type = 'monthly'
        RETURNING *
    )
    INSERT INTO employee_statistics_archive SELECT * FROM old_stats;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 8. SCHEDULED JOBS (przykłady dla cron/pg_cron)
-- ---------------------------------------------------------------------------------

/*
-- Przykłady scheduled jobs (wymagają pg_cron extension)

-- Odśwież materialized views codziennie o 6:00
SELECT cron.schedule('refresh-mv-daily', '0 6 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_month_stats; REFRESH MATERIALIZED VIEW CONCURRENTLY mv_performance_ranking;');

-- Wyczyść cache co tydzień
SELECT cron.schedule('cleanup-cache-weekly', '0 2 * * 0', 'SELECT cleanup_old_cache();');

-- Archiwizuj stare statystyki co miesiąc
SELECT cron.schedule('archive-stats-monthly', '0 1 1 * *', 'SELECT archive_old_statistics();');

-- Analiza wydajności co tydzień
SELECT cron.schedule('performance-analysis', '0 3 * * 1', 'SELECT analyze_query_performance();');
*/

-- ---------------------------------------------------------------------------------
-- INICJALIZACJA OPTYMALIZACJI
-- ---------------------------------------------------------------------------------

-- Odśwież wszystkie materialized views
REFRESH MATERIALIZED VIEW mv_current_month_stats;
REFRESH MATERIALIZED VIEW mv_performance_ranking;

-- Zbuduj hierarchy cache
SELECT refresh_hierarchy_cache();

-- Przeanalizuj tabele dla optymalizatora
ANALYZE users;
ANALYZE employee_statistics;
ANALYZE activity_logs;
ANALYZE clients;
ANALYZE locations;

-- Podsumowanie optymalizacji
SELECT 
    'Optymalizacje wdrożone pomyślnie' as status,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') as materialized_views,
    (SELECT COUNT(*) FROM hierarchy_cache) as hierarchy_cache_entries; 