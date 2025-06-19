-- KOMPLETNE UTWORZENIE TABELI EMPLOYEE_STATS
-- Zawiera wszystkie potrzebne kolumny w tym edytowalne pola

-- 1. Stworzenie tabeli z wszystkimi kolumnami
CREATE TABLE IF NOT EXISTS employee_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Norma dzienna i prowizja
  daily_target INTEGER DEFAULT 20, -- norma 20/20/20
  commission_rate DECIMAL(4,2) DEFAULT 3.0, -- prowizja w %
  
  -- Statystyki miesięczne (automatyczne)
  monthly_canvas INTEGER DEFAULT 0,
  monthly_antysale INTEGER DEFAULT 0,
  monthly_sale INTEGER DEFAULT 0,
  total_commissions DECIMAL(10,2) DEFAULT 0, -- łączne prowizje EUR
  total_penalties DECIMAL(10,2) DEFAULT 0, -- łączne kary EUR
  
  -- NOWE: Edytowalne pola ręczne
  custom_clients_count INTEGER DEFAULT 0, -- ręcznie edytowana ilość klientów
  custom_total_payments DECIMAL(10,2) DEFAULT 0.00, -- ręcznie edytowana suma wpłat PLN
  
  -- Metadane
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ograniczenia
  UNIQUE(user_id) -- jeden rekord na pracownika
);

-- 2. Komentarze do kolumn
COMMENT ON TABLE employee_stats IS 'Statystyki pracowników z systemem prowizji i edytowalnych pól';
COMMENT ON COLUMN employee_stats.daily_target IS 'Norma dzienna (domyślnie 20)';
COMMENT ON COLUMN employee_stats.commission_rate IS 'Procent prowizji (np. 3.5 = 3.5%)';
COMMENT ON COLUMN employee_stats.monthly_canvas IS 'Liczba Canvas w miesiącu (automatyczne)';
COMMENT ON COLUMN employee_stats.monthly_antysale IS 'Liczba AntySale w miesiącu (automatyczne)';
COMMENT ON COLUMN employee_stats.monthly_sale IS 'Liczba Sale w miesiącu (automatyczne)';
COMMENT ON COLUMN employee_stats.custom_clients_count IS 'Ręcznie edytowana ilość klientów pracownika';
COMMENT ON COLUMN employee_stats.custom_total_payments IS 'Ręcznie edytowana suma wpłat pracownika w PLN';

-- 3. Indeksy dla wydajności
CREATE INDEX idx_employee_stats_user_id ON employee_stats(user_id);
CREATE INDEX idx_employee_stats_updated_at ON employee_stats(updated_at);
CREATE INDEX idx_employee_stats_custom_clients ON employee_stats(custom_clients_count);
CREATE INDEX idx_employee_stats_custom_payments ON employee_stats(custom_total_payments);

-- 4. Funkcja do automatycznego ustawiania updated_at
CREATE OR REPLACE FUNCTION update_employee_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger dla updated_at
DROP TRIGGER IF EXISTS trigger_employee_stats_updated_at ON employee_stats;
CREATE TRIGGER trigger_employee_stats_updated_at
    BEFORE UPDATE ON employee_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_stats_updated_at();

-- 6. Polityki RLS (Row Level Security)
ALTER TABLE employee_stats ENABLE ROW LEVEL SECURITY;

-- Usuń istniejące polityki jeśli istnieją
DROP POLICY IF EXISTS employee_stats_select_own ON employee_stats;
DROP POLICY IF EXISTS employee_stats_insert_manager ON employee_stats;
DROP POLICY IF EXISTS employee_stats_update_manager ON employee_stats;
DROP POLICY IF EXISTS employee_stats_delete_admin ON employee_stats;

-- Pracownicy widzą tylko swoje statystyki, manager+ widzą wszystkie
CREATE POLICY employee_stats_select_own ON employee_stats
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR 
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'szef', 'admin')
);

-- Tylko manager/szef/admin mogą dodawać statystyki
CREATE POLICY employee_stats_insert_manager ON employee_stats
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'szef', 'admin')
);

-- Tylko manager/szef/admin mogą modyfikować statystyki
CREATE POLICY employee_stats_update_manager ON employee_stats
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'szef', 'admin')
);

-- Tylko admin może usuwać statystyki
CREATE POLICY employee_stats_delete_admin ON employee_stats
FOR DELETE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 7. Dodaj podstawowe rekordy dla istniejących pracowników
INSERT INTO employee_stats (
  user_id, 
  daily_target, 
  commission_rate,
  custom_clients_count,
  custom_total_payments
)
SELECT 
  id,
  20, -- domyślna norma
  CASE 
    WHEN role = 'admin' THEN 5.0
    WHEN role = 'szef' THEN 4.5
    WHEN role = 'manager' THEN 4.0
    ELSE 3.0 -- pracownik
  END,
  0, -- default custom_clients_count
  0.00 -- default custom_total_payments
FROM users 
WHERE role IN ('pracownik', 'manager', 'szef', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- 8. Sprawdź strukturę tabeli
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employee_stats'
ORDER BY ordinal_position;

-- 9. Sprawdź utworzone rekordy
SELECT 
  es.*,
  u.full_name,
  u.email,
  u.role
FROM employee_stats es
JOIN users u ON es.user_id = u.id
ORDER BY u.role, u.full_name;

-- 10. Test funkcji edycji (przykład)
-- UPDATE employee_stats 
-- SET 
--     custom_clients_count = 50,
--     custom_total_payments = 15000.50
-- WHERE user_id = (SELECT id FROM users WHERE role = 'pracownik' LIMIT 1); 