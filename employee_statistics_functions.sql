-- =====================================================
-- FUNKCJE POMOCNICZE DLA TABELI EMPLOYEE_STATISTICS
-- =====================================================

-- Funkcja do aktualizacji statystyk pracownika
CREATE OR REPLACE FUNCTION update_employee_statistics(
    p_user_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_clients_count INTEGER DEFAULT NULL,
    p_total_payments_eur DECIMAL DEFAULT NULL,
    p_work_minutes INTEGER DEFAULT NULL,
    p_activities INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_record RECORD;
BEGIN
    -- Sprawdź czy rekord istnieje
    SELECT * INTO existing_record 
    FROM employee_statistics 
    WHERE user_id = p_user_id 
      AND period_type = 'monthly' 
      AND period_start = p_period_start 
      AND period_end = p_period_end;
    
    -- Jeśli rekord istnieje, zaktualizuj go
    IF FOUND THEN
        UPDATE employee_statistics SET
            clients_count = COALESCE(p_clients_count, clients_count),
            total_payments_eur = COALESCE(p_total_payments_eur, total_payments_eur),
            total_work_minutes = COALESCE(p_work_minutes, total_work_minutes),
            total_activities = COALESCE(p_activities, total_activities),
            updated_at = NOW()
        WHERE user_id = p_user_id 
          AND period_type = 'monthly' 
          AND period_start = p_period_start 
          AND period_end = p_period_end;
    ELSE
        -- Jeśli nie istnieje, utwórz nowy rekord
        INSERT INTO employee_statistics (
            user_id, period_type, period_start, period_end,
            clients_count, total_payments_eur, total_work_minutes, total_activities
        ) VALUES (
            p_user_id, 'monthly', p_period_start, p_period_end,
            COALESCE(p_clients_count, 0),
            COALESCE(p_total_payments_eur, 0.00),
            COALESCE(p_work_minutes, 0),
            COALESCE(p_activities, 0)
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funkcja zwracająca najlepszych pracowników
CREATE OR REPLACE FUNCTION get_top_employees(
    p_year INTEGER,
    p_month INTEGER,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    employee_name TEXT,
    email TEXT,
    clients_count INTEGER,
    commission_eur DECIMAL(10,2),
    efficiency_percentage DECIMAL(5,2),
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.raw_user_meta_data->>'full_name' as employee_name,
        u.email,
        es.clients_count,
        es.commission_eur,
        es.efficiency_percentage,
        ROW_NUMBER() OVER (ORDER BY es.commission_eur DESC)::INTEGER as rank
    FROM employee_statistics es
    JOIN auth.users u ON es.user_id = u.id
    WHERE es.period_type = 'monthly'
      AND EXTRACT(YEAR FROM es.period_start) = p_year
      AND EXTRACT(MONTH FROM es.period_start) = p_month
      AND es.is_active = TRUE
    ORDER BY es.commission_eur DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do generowania przykładowych danych
CREATE OR REPLACE FUNCTION generate_sample_data()
RETURNS VOID AS $$
DECLARE
    sample_users UUID[];
    user_id UUID;
BEGIN
    -- Pobierz ID pierwszych kilku użytkowników
    SELECT ARRAY(SELECT id FROM auth.users LIMIT 5) INTO sample_users;
    
    -- Generuj dane dla każdego użytkownika
    FOREACH user_id IN ARRAY sample_users
    LOOP
        INSERT INTO employee_statistics (
            user_id, period_type, period_start, period_end,
            clients_count, total_payments_eur,
            total_work_minutes, days_worked, expected_work_minutes,
            status_canvas, status_sale, status_antysale, status_no_contact,
            daily_target, daily_achieved, total_activities,
            efficiency_percentage, is_calculated
        ) VALUES (
            user_id, 'monthly', '2024-12-01', '2024-12-31',
            50 + (RANDOM() * 100)::INTEGER, -- 50-150 klientów
            (5000 + RANDOM() * 10000)::DECIMAL(10,2), -- 5k-15k EUR
            (7000 + RANDOM() * 3000)::INTEGER, -- 116-166 godzin
            22, 10560, -- 22 dni robocze, 176h oczekiwane
            (20 + RANDOM() * 30)::INTEGER, -- canvas
            (5 + RANDOM() * 15)::INTEGER, -- sale  
            (5 + RANDOM() * 10)::INTEGER, -- antysale
            (10 + RANDOM() * 20)::INTEGER, -- no contact
            8, (6 + RANDOM() * 4)::INTEGER, -- cel i osiągnięcie
            (150 + RANDOM() * 200)::INTEGER, -- aktywności
            (70 + RANDOM() * 30)::DECIMAL(5,2), -- efektywność 70-100%
            TRUE
        )
        ON CONFLICT (user_id, period_type, period_start, period_end) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT 'Funkcje pomocnicze zostały utworzone!' as status; 