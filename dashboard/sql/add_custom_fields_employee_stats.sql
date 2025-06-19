-- Dodanie kolumn do edycji ręcznej ilości klientów i sumy wpłat w tabeli employee_stats

-- 1. Dodaj kolumnę custom_clients_count (ilość klientów do edycji ręcznej)
ALTER TABLE employee_stats 
ADD COLUMN custom_clients_count INTEGER DEFAULT 0;

-- 2. Dodaj kolumnę custom_total_payments (suma wpłat w PLN do edycji ręcznej)
ALTER TABLE employee_stats 
ADD COLUMN custom_total_payments DECIMAL(10,2) DEFAULT 0.00;

-- 3. Dodaj komentarze do kolumn
COMMENT ON COLUMN employee_stats.custom_clients_count IS 'Ręcznie edytowana ilość klientów pracownika';
COMMENT ON COLUMN employee_stats.custom_total_payments IS 'Ręcznie edytowana suma wpłat pracownika w PLN';

-- 4. Dodaj indeksy dla wydajności wyszukiwania
CREATE INDEX idx_employee_stats_custom_clients ON employee_stats(custom_clients_count);
CREATE INDEX idx_employee_stats_custom_payments ON employee_stats(custom_total_payments);

-- 5. Przykład użycia - aktualizacja statystyk dla konkretnego pracownika
-- UPDATE employee_stats 
-- SET 
--     custom_clients_count = 50,
--     custom_total_payments = 15000.00,
--     monthly_canvas = 17,
--     monthly_antysale = 16,
--     monthly_sale = 17,
--     total_commissions = 100.00
-- WHERE user_id = 'user_id_pracownika';

-- 6. Sprawdzenie danych po aktualizacji
-- SELECT 
--     es.*,
--     u.full_name,
--     u.email,
--     u.role
-- FROM employee_stats es
-- JOIN users u ON es.user_id = u.id
-- WHERE u.role = 'pracownik'
-- ORDER BY u.full_name; 