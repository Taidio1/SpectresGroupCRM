-- Stworzenie tabeli statystyk pracowników z prowizją
CREATE TABLE IF NOT EXISTS employee_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Norma dzienna
  daily_target INTEGER DEFAULT 20, -- norma 20/20/20
  commission_rate DECIMAL(4,2) DEFAULT 3.0, -- prowizja w %
  
  -- Statystyki miesięczne (aktualizowane przez trigger lub cronjob)
  monthly_canvas INTEGER DEFAULT 0,
  monthly_antysale INTEGER DEFAULT 0,
  monthly_sale INTEGER DEFAULT 0,
  total_commissions DECIMAL(10,2) DEFAULT 0, -- łączne prowizje EUR
  total_penalties DECIMAL(10,2) DEFAULT 0, -- łączne kary EUR
  
  -- Metadane
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indeksy i ograniczenia
  UNIQUE(user_id) -- jeden rekord na pracownika
);

-- Komentarze do tabeli
COMMENT ON TABLE employee_stats IS 'Statystyki pracowników z systemem prowizji i kar';
COMMENT ON COLUMN employee_stats.daily_target IS 'Norma dzienna (domyślnie 20)';
COMMENT ON COLUMN employee_stats.commission_rate IS 'Procent prowizji (np. 3.5 = 3.5%)';
COMMENT ON COLUMN employee_stats.monthly_canvas IS 'Liczba Canvas w miesiącu';
COMMENT ON COLUMN employee_stats.monthly_antysale IS 'Liczba AntySale w miesiącu';
COMMENT ON COLUMN employee_stats.monthly_sale IS 'Liczba Sale w miesiącu';

-- Indeksy dla wydajności
CREATE INDEX idx_employee_stats_user_id ON employee_stats(user_id);
CREATE INDEX idx_employee_stats_updated_at ON employee_stats(updated_at);

-- Funkcja do automatycznego ustawiania updated_at
CREATE OR REPLACE FUNCTION update_employee_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla updated_at
CREATE TRIGGER trigger_employee_stats_updated_at
    BEFORE UPDATE ON employee_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_stats_updated_at();

-- Polityki RLS dla employee_stats
ALTER TABLE employee_stats ENABLE ROW LEVEL SECURITY;

-- Pracownicy widzą tylko swoje statystyki
CREATE POLICY employee_stats_select_own ON employee_stats
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR 
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'szef', 'admin')
);

-- Tylko manager/szef/admin mogą modyfikować statystyki
CREATE POLICY employee_stats_insert_manager ON employee_stats
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'szef', 'admin')
);

CREATE POLICY employee_stats_update_manager ON employee_stats
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'szef', 'admin')
);

CREATE POLICY employee_stats_delete_admin ON employee_stats
FOR DELETE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Dodaj podstawowe rekordy dla istniejących użytkowników
INSERT INTO employee_stats (user_id, daily_target, commission_rate)
SELECT 
  id,
  20, -- domyślna norma
  CASE 
    WHEN role = 'admin' THEN 5.0
    WHEN role = 'szef' THEN 4.5
    WHEN role = 'manager' THEN 4.0
    ELSE 3.0 -- pracownik
  END
FROM users 
WHERE role IN ('pracownik', 'manager', 'szef', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- Sprawdź czy tabela została stworzona poprawnie
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employee_stats'
ORDER BY ordinal_position; 