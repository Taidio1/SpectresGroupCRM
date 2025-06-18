-- Sprawdź obecny typ ENUM dla statusu
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%status%'
ORDER BY e.enumsortorder;

-- Sprawdź aktualną strukturę kolumny status w tabeli clients
SELECT 
    column_name, 
    data_type, 
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'status';

-- OPCJA 1: Jeśli status to ENUM, dodaj brakujące wartości
-- (Najpierw sprawdź jakie wartości już istnieją w ENUM)

-- Dodaj brakujące wartości do ENUM (jeśli potrzebne)
-- ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'canvas';
-- ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'brak_kontaktu';
-- ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'nie_zainteresowany';
-- ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'zdenerwowany';
-- ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'antysale';
-- ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'sale';
-- ALTER TYPE client_status ADD VALUE IF NOT EXISTS '$$';

-- OPCJA 2: Jeśli chcesz zmienić ENUM na VARCHAR (prostsze)
-- ALTER TABLE clients ALTER COLUMN status TYPE VARCHAR(50);

-- Sprawdź czy są jakieś rekordy z pustym statusem (tylko NULL dla ENUM)
SELECT id, first_name, last_name, status 
FROM clients 
WHERE status IS NULL;

-- Ustaw domyślny status dla pustych rekordów (tylko IS NULL, bez porównania z '')
UPDATE clients 
SET status = 'canvas' 
WHERE status IS NULL;

-- Dodaj constraint sprawdzający poprawne wartości (jeśli status to VARCHAR)
-- ALTER TABLE clients ADD CONSTRAINT check_status_values 
-- CHECK (status IN ('canvas', 'brak_kontaktu', 'nie_zainteresowany', 'zdenerwowany', 'antysale', 'sale', '$$')); 