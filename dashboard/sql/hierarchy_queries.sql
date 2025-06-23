-- =====================================================================================
-- ZAPYTANIA LOGICZNE DLA RÓŻNYCH RÓL W HIERARCHII ORGANIZACYJNEJ
-- Spectres Group CRM - System dostępu oparty na hierarchii i lokalizacji
-- =====================================================================================

-- ---------------------------------------------------------------------------------
-- 1. SZEF - WIDZI CAŁOŚĆ (WSZYSTKIE KRAJE I PRACOWNIKÓW)
-- ---------------------------------------------------------------------------------

-- Przegląd całej organizacji
CREATE OR REPLACE VIEW v_ceo_overview AS
SELECT 
    l.name as location,
    l.code as country_code,
    COUNT(CASE WHEN u.role = 'project_manager' THEN 1 END) as project_managers,
    COUNT(CASE WHEN u.role = 'junior_manager' THEN 1 END) as junior_managers,
    COUNT(CASE WHEN u.role = 'pracownik' THEN 1 END) as employees,
    COUNT(u.id) as total_staff,
    COALESCE(SUM(es.total_payments_eur), 0) as total_revenue,
    COALESCE(AVG(es.efficiency_percentage), 0) as avg_efficiency
FROM locations l
LEFT JOIN users u ON l.id = u.location_id AND u.is_active = true
LEFT JOIN employee_statistics es ON u.id = es.user_id 
    AND es.period_type = 'monthly' 
    AND es.period_start >= date_trunc('month', CURRENT_DATE)
GROUP BY l.id, l.name, l.code
ORDER BY l.name;

-- Najlepsi performerzy w organizacji (dla szefa)
CREATE OR REPLACE FUNCTION get_top_performers_global(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    employee_name TEXT,
    location TEXT,
    manager_name TEXT,
    total_sales INTEGER,
    revenue_eur NUMERIC,
    efficiency_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.full_name,
        l.name,
        m.full_name,
        COALESCE(es.status_sale, 0),
        COALESCE(es.total_payments_eur, 0),
        COALESCE(es.efficiency_percentage, 0)
    FROM users u
    JOIN locations l ON u.location_id = l.id
    LEFT JOIN users m ON u.manager_id = m.id
    LEFT JOIN employee_statistics es ON u.id = es.user_id 
        AND es.period_type = 'monthly'
        AND es.period_start >= date_trunc('month', CURRENT_DATE)
    WHERE u.role = 'pracownik' AND u.is_active = true
    ORDER BY es.efficiency_percentage DESC NULLS LAST, es.status_sale DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 2. PROJECT MANAGER - WIDZI SWOICH PODWŁADNYCH (JM + PRACOWNIKÓW)
-- ---------------------------------------------------------------------------------

-- Widok dla Project Managera - jego zespół
CREATE OR REPLACE FUNCTION get_project_manager_team(pm_uuid UUID)
RETURNS TABLE(
    employee_id UUID,
    employee_name TEXT,
    role user_role,
    direct_reports INTEGER,
    monthly_sales INTEGER,
    monthly_revenue NUMERIC,
    efficiency NUMERIC,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH team_members AS (
        -- Project Manager sam siebie
        SELECT pm_uuid as user_id, 0 as level
        UNION ALL
        -- Wszyscy podwładni (rekurencyjnie)
        SELECT user_id, level FROM get_subordinates(pm_uuid)
    )
    SELECT 
        u.id,
        u.full_name,
        u.role,
        (SELECT COUNT(*)::INTEGER FROM users sub WHERE sub.manager_id = u.id AND sub.is_active = true),
        COALESCE(es.status_sale, 0),
        COALESCE(es.total_payments_eur, 0),
        COALESCE(es.efficiency_percentage, 0),
        es.last_activity_at
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    LEFT JOIN employee_statistics es ON u.id = es.user_id 
        AND es.period_type = 'monthly'
        AND es.period_start >= date_trunc('month', CURRENT_DATE)
    WHERE u.is_active = true
    ORDER BY u.role_hierarchy_level, u.full_name;
END;
$$ LANGUAGE plpgsql;

-- Statystyki zespołu dla Project Managera
CREATE OR REPLACE FUNCTION get_pm_team_stats(pm_uuid UUID)
RETURNS TABLE(
    total_team_members INTEGER,
    total_junior_managers INTEGER,
    total_employees INTEGER,
    team_total_sales INTEGER,
    team_total_revenue NUMERIC,
    team_avg_efficiency NUMERIC,
    top_performer TEXT,
    underperformers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH team_stats AS (
        SELECT 
            u.id,
            u.full_name,
            u.role,
            COALESCE(es.status_sale, 0) as sales,
            COALESCE(es.total_payments_eur, 0) as revenue,
            COALESCE(es.efficiency_percentage, 0) as efficiency
        FROM users u
        LEFT JOIN employee_statistics es ON u.id = es.user_id 
            AND es.period_type = 'monthly'
            AND es.period_start >= date_trunc('month', CURRENT_DATE)
        WHERE (u.id = pm_uuid OR u.id IN (SELECT user_id FROM get_subordinates(pm_uuid)))
          AND u.is_active = true
    )
    SELECT 
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN role = 'junior_manager' THEN 1 END)::INTEGER,
        COUNT(CASE WHEN role = 'pracownik' THEN 1 END)::INTEGER,
        SUM(sales)::INTEGER,
        SUM(revenue),
        AVG(efficiency),
        (SELECT full_name FROM team_stats ORDER BY efficiency DESC LIMIT 1),
        COUNT(CASE WHEN efficiency < 50 THEN 1 END)::INTEGER
    FROM team_stats;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 3. JUNIOR MANAGER - WIDZI TYLKO PRZYPISANYCH PRACOWNIKÓW
-- ---------------------------------------------------------------------------------

-- Bezpośredni podwładni Junior Managera
CREATE OR REPLACE FUNCTION get_junior_manager_employees(jm_uuid UUID)
RETURNS TABLE(
    employee_id UUID,
    employee_name TEXT,
    start_date DATE,
    monthly_target INTEGER,
    monthly_achieved INTEGER,
    efficiency NUMERIC,
    last_activity TIMESTAMPTZ,
    needs_attention BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.start_date,
        COALESCE(es.monthly_target, 0),
        COALESCE(es.monthly_achieved, 0),
        COALESCE(es.efficiency_percentage, 0),
        es.last_activity_at,
        (es.efficiency_percentage < 50 OR es.last_activity_at < NOW() - INTERVAL '2 days')
    FROM users u
    LEFT JOIN employee_statistics es ON u.id = es.user_id 
        AND es.period_type = 'monthly'
        AND es.period_start >= date_trunc('month', CURRENT_DATE)
    WHERE u.manager_id = jm_uuid 
      AND u.role = 'pracownik' 
      AND u.is_active = true
    ORDER BY es.efficiency_percentage DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Raport dla Junior Managera o jego zespole
CREATE OR REPLACE FUNCTION get_jm_team_report(jm_uuid UUID)
RETURNS TABLE(
    team_size INTEGER,
    total_sales INTEGER,
    total_revenue NUMERIC,
    avg_efficiency NUMERIC,
    employees_on_target INTEGER,
    employees_below_target INTEGER,
    urgent_interventions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH team_performance AS (
        SELECT 
            u.id,
            COALESCE(es.status_sale, 0) as sales,
            COALESCE(es.total_payments_eur, 0) as revenue,
            COALESCE(es.efficiency_percentage, 0) as efficiency,
            COALESCE(es.monthly_target, 0) as target,
            COALESCE(es.monthly_achieved, 0) as achieved,
            es.last_activity_at
        FROM users u
        LEFT JOIN employee_statistics es ON u.id = es.user_id 
            AND es.period_type = 'monthly'
            AND es.period_start >= date_trunc('month', CURRENT_DATE)
        WHERE u.manager_id = jm_uuid 
          AND u.role = 'pracownik' 
          AND u.is_active = true
    )
    SELECT 
        COUNT(*)::INTEGER,
        SUM(sales)::INTEGER,
        SUM(revenue),
        AVG(efficiency),
        COUNT(CASE WHEN achieved >= target THEN 1 END)::INTEGER,
        COUNT(CASE WHEN achieved < target THEN 1 END)::INTEGER,
        COUNT(CASE WHEN efficiency < 30 OR last_activity_at < NOW() - INTERVAL '3 days' THEN 1 END)::INTEGER
    FROM team_performance;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 4. PRACOWNIK - WIDZI TYLKO SWOJE DANE
-- ---------------------------------------------------------------------------------

-- Osobiste statystyki pracownika
CREATE OR REPLACE FUNCTION get_employee_personal_stats(emp_uuid UUID)
RETURNS TABLE(
    current_month_sales INTEGER,
    current_month_revenue NUMERIC,
    monthly_target INTEGER,
    target_progress NUMERIC,
    efficiency_percentage NUMERIC,
    days_remaining INTEGER,
    daily_target_remaining NUMERIC,
    ranking_in_team INTEGER,
    manager_name TEXT,
    location TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH employee_data AS (
        SELECT 
            u.id,
            u.full_name,
            u.location_id,
            l.name as location_name,
            m.full_name as manager_full_name,
            COALESCE(es.status_sale, 0) as sales,
            COALESCE(es.total_payments_eur, 0) as revenue,
            COALESCE(es.monthly_target, 0) as target,
            COALESCE(es.monthly_achieved, 0) as achieved,
            COALESCE(es.efficiency_percentage, 0) as efficiency
        FROM users u
        LEFT JOIN locations l ON u.location_id = l.id
        LEFT JOIN users m ON u.manager_id = m.id
        LEFT JOIN employee_statistics es ON u.id = es.user_id 
            AND es.period_type = 'monthly'
            AND es.period_start >= date_trunc('month', CURRENT_DATE)
        WHERE u.id = emp_uuid
    ),
    team_ranking AS (
        SELECT 
            u.id,
            ROW_NUMBER() OVER (ORDER BY es.efficiency_percentage DESC) as rank
        FROM users u
        LEFT JOIN employee_statistics es ON u.id = es.user_id 
            AND es.period_type = 'monthly'
            AND es.period_start >= date_trunc('month', CURRENT_DATE)
        WHERE u.manager_id = (SELECT manager_id FROM users WHERE id = emp_uuid)
          AND u.role = 'pracownik'
          AND u.is_active = true
    )
    SELECT 
        ed.sales,
        ed.revenue,
        ed.target,
        CASE WHEN ed.target > 0 THEN (ed.achieved::NUMERIC / ed.target * 100) ELSE 0 END,
        ed.efficiency,
        (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE)::INTEGER,
        CASE 
            WHEN ed.target > ed.achieved AND (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE)::INTEGER > 0
            THEN (ed.target - ed.achieved)::NUMERIC / (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE)::INTEGER
            ELSE 0
        END,
        COALESCE(tr.rank, 0)::INTEGER,
        ed.manager_full_name,
        ed.location_name
    FROM employee_data ed
    LEFT JOIN team_ranking tr ON ed.id = tr.id;
END;
$$ LANGUAGE plpgsql;

-- Historia wydajności pracownika (ostatnie 6 miesięcy)
CREATE OR REPLACE FUNCTION get_employee_performance_history(emp_uuid UUID)
RETURNS TABLE(
    month_year TEXT,
    sales INTEGER,
    revenue NUMERIC,
    efficiency NUMERIC,
    target INTEGER,
    achieved INTEGER,
    trend TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_stats AS (
        SELECT 
            TO_CHAR(es.period_start, 'YYYY-MM') as month_year,
            es.period_start,
            COALESCE(es.status_sale, 0) as sales,
            COALESCE(es.total_payments_eur, 0) as revenue,
            COALESCE(es.efficiency_percentage, 0) as efficiency,
            COALESCE(es.monthly_target, 0) as target,
            COALESCE(es.monthly_achieved, 0) as achieved,
            LAG(es.efficiency_percentage) OVER (ORDER BY es.period_start) as prev_efficiency
        FROM employee_statistics es
        WHERE es.user_id = emp_uuid
          AND es.period_type = 'monthly'
          AND es.period_start >= CURRENT_DATE - INTERVAL '6 months'
        ORDER BY es.period_start DESC
    )
    SELECT 
        month_year,
        sales,
        revenue,
        efficiency,
        target,
        achieved,
        CASE 
            WHEN prev_efficiency IS NULL THEN 'N/A'
            WHEN efficiency > prev_efficiency THEN 'Wzrost'
            WHEN efficiency < prev_efficiency THEN 'Spadek'
            ELSE 'Stabilny'
        END
    FROM monthly_stats;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 5. RAPORTY MIĘDZYLOKALIZACYJNE (DLA SZEFA I PM)
-- ---------------------------------------------------------------------------------

-- Porównanie wydajności między krajami
CREATE OR REPLACE FUNCTION get_location_comparison()
RETURNS TABLE(
    location TEXT,
    country_code TEXT,
    total_employees INTEGER,
    avg_efficiency NUMERIC,
    total_sales INTEGER,
    total_revenue NUMERIC,
    revenue_per_employee NUMERIC,
    top_performer TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.name,
        l.code,
        COUNT(u.id)::INTEGER,
        COALESCE(AVG(es.efficiency_percentage), 0),
        COALESCE(SUM(es.status_sale), 0)::INTEGER,
        COALESCE(SUM(es.total_payments_eur), 0),
        CASE 
            WHEN COUNT(u.id) > 0 THEN COALESCE(SUM(es.total_payments_eur), 0) / COUNT(u.id)
            ELSE 0
        END,
        (
            SELECT u2.full_name 
            FROM users u2 
            LEFT JOIN employee_statistics es2 ON u2.id = es2.user_id 
                AND es2.period_type = 'monthly'
                AND es2.period_start >= date_trunc('month', CURRENT_DATE)
            WHERE u2.location_id = l.id 
              AND u2.role = 'pracownik' 
              AND u2.is_active = true
            ORDER BY es2.efficiency_percentage DESC 
            LIMIT 1
        )
    FROM locations l
    LEFT JOIN users u ON l.id = u.location_id AND u.is_active = true AND u.role = 'pracownik'
    LEFT JOIN employee_statistics es ON u.id = es.user_id 
        AND es.period_type = 'monthly'
        AND es.period_start >= date_trunc('month', CURRENT_DATE)
    GROUP BY l.id, l.name, l.code
    ORDER BY avg_efficiency DESC;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 6. FUNKCJE HELPERS DLA APLIKACJI FRONTEND
-- ---------------------------------------------------------------------------------

-- Sprawdź uprawnienia użytkownika do widoku danych
CREATE OR REPLACE FUNCTION check_user_access(viewer_uuid UUID, target_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    viewer_role user_role;
    target_role user_role;
BEGIN
    SELECT role INTO viewer_role FROM users WHERE id = viewer_uuid;
    SELECT role INTO target_role FROM users WHERE id = target_uuid;
    
    -- Szef i Admin widzą wszystko
    IF viewer_role IN ('szef', 'admin') THEN
        RETURN TRUE;
    END IF;
    
    -- Pracownik widzi tylko siebie
    IF viewer_role = 'pracownik' THEN
        RETURN viewer_uuid = target_uuid;
    END IF;
    
    -- Project Manager widzi swoich podwładnych
    IF viewer_role = 'project_manager' THEN
        RETURN viewer_uuid = target_uuid OR is_manager_of(viewer_uuid, target_uuid);
    END IF;
    
    -- Junior Manager widzi siebie i bezpośrednich podwładnych
    IF viewer_role = 'junior_manager' THEN
        RETURN viewer_uuid = target_uuid OR 
               EXISTS (SELECT 1 FROM users WHERE id = target_uuid AND manager_id = viewer_uuid);
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Pobierz listę użytkowników dostępnych dla danej roli
CREATE OR REPLACE FUNCTION get_accessible_users(viewer_uuid UUID)
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    role user_role,
    location_name TEXT,
    manager_name TEXT
) AS $$
DECLARE
    viewer_role user_role;
BEGIN
    SELECT role INTO viewer_role FROM users WHERE id = viewer_uuid;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.role,
        l.name,
        m.full_name
    FROM users u
    LEFT JOIN locations l ON u.location_id = l.id
    LEFT JOIN users m ON u.manager_id = m.id
    WHERE u.is_active = true
      AND (
          -- Szef i Admin widzą wszystkich
          viewer_role IN ('szef', 'admin')
          OR
          -- Project Manager widzi swoich podwładnych
          (viewer_role = 'project_manager' AND (u.id = viewer_uuid OR u.id IN (SELECT user_id FROM get_subordinates(viewer_uuid))))
          OR
          -- Junior Manager widzi siebie i bezpośrednich podwładnych
          (viewer_role = 'junior_manager' AND (u.id = viewer_uuid OR u.manager_id = viewer_uuid))
          OR
          -- Pracownik widzi tylko siebie
          (viewer_role = 'pracownik' AND u.id = viewer_uuid)
      )
    ORDER BY u.role_hierarchy_level, u.full_name;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- PRZYKŁADY UŻYCIA
-- ---------------------------------------------------------------------------------

/*
-- Przykład 1: Szef sprawdza przegląd organizacji
SELECT * FROM v_ceo_overview;

-- Przykład 2: Project Manager sprawdza swój zespół
SELECT * FROM get_project_manager_team('project_manager_uuid');

-- Przykład 3: Junior Manager sprawdza swoich pracowników
SELECT * FROM get_junior_manager_employees('junior_manager_uuid');

-- Przykład 4: Pracownik sprawdza swoje statystyki
SELECT * FROM get_employee_personal_stats('employee_uuid');

-- Przykład 5: Porównanie lokalizacji (dla szefa)
SELECT * FROM get_location_comparison();

-- Przykład 6: Sprawdzenie uprawnień
SELECT check_user_access('manager_uuid', 'employee_uuid');

-- Przykład 7: Lista dostępnych użytkowników
SELECT * FROM get_accessible_users('current_user_uuid');
*/ 