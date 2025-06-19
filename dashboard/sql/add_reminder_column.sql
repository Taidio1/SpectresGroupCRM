-- Dodanie kolumny reminder do tabeli clients
-- Ta kolumna będzie przechowywać dane przypomnienia w formacie JSON

-- 1. Dodaj kolumnę reminder jako JSONB
ALTER TABLE clients 
ADD COLUMN reminder JSONB DEFAULT NULL;

-- 2. Dodaj komentarz do kolumny
COMMENT ON COLUMN clients.reminder IS 'Przypomnienie dla klienta w formacie JSON: {enabled: boolean, date: string, time: string, note: string}';

-- 3. Dodaj indeks dla szybszego wyszukiwania po dacie przypomnienia
CREATE INDEX idx_clients_reminder_date ON clients 
USING BTREE ((reminder->>'date')) 
WHERE reminder IS NOT NULL AND (reminder->>'enabled')::boolean = true;

-- 4. Dodaj indeks dla szybszego wyszukiwania aktywnych przypomnień (GIN dla JSONB)
CREATE INDEX idx_clients_reminder_enabled ON clients 
USING GIN (reminder) 
WHERE reminder IS NOT NULL AND (reminder->>'enabled')::boolean = true;

-- 5. Przykład dodania przypomnienia (dla testów)
-- UPDATE clients 
-- SET reminder = '{"enabled": true, "date": "2024-12-11", "time": "14:30", "note": "Zadzwonić w sprawie oferty"}'::jsonb
-- WHERE id = 'some_client_id';

-- 6. Przykład wyszukiwania klientów z przypomnienami na konkretną datę
-- SELECT * FROM clients 
-- WHERE reminder IS NOT NULL 
-- AND (reminder->>'enabled')::boolean = true 
-- AND reminder->>'date' = '2024-12-11'
-- ORDER BY reminder->>'time';

-- 7. Funkcja pomocnicza do walidacji formatu przypomnienia
CREATE OR REPLACE FUNCTION validate_reminder_format(reminder_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Sprawdź czy reminder ma wszystkie wymagane pola
    IF reminder_data IS NULL THEN
        RETURN TRUE; -- NULL jest dozwolone
    END IF;
    
    -- Sprawdź czy ma wymagane klucze
    IF NOT (
        reminder_data ? 'enabled' AND
        reminder_data ? 'date' AND
        reminder_data ? 'time' AND
        reminder_data ? 'note'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Sprawdź typy danych
    IF NOT (
        (reminder_data->>'enabled')::text IN ('true', 'false') AND
        (reminder_data->>'date')::text ~ '^\d{4}-\d{2}-\d{2}$' AND
        (reminder_data->>'time')::text ~ '^\d{2}:\d{2}$'
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Dodaj constraint do walidacji formatu
ALTER TABLE clients 
ADD CONSTRAINT check_reminder_format 
CHECK (validate_reminder_format(reminder));

-- 9. Przykłady użycia dla różnych scenariuszy:

-- Dodanie przypomnienia:
-- UPDATE clients 
-- SET reminder = jsonb_build_object(
--     'enabled', true,
--     'date', '2024-12-11',
--     'time', '14:30',
--     'note', 'Zadzwonić w sprawie oferty'
-- )
-- WHERE id = 'client_id';

-- Wyłączenie przypomnienia (bez usuwania danych):
-- UPDATE clients 
-- SET reminder = jsonb_set(reminder, '{enabled}', 'false'::jsonb)
-- WHERE id = 'client_id';

-- Usunięcie przypomnienia:
-- UPDATE clients 
-- SET reminder = NULL
-- WHERE id = 'client_id';

-- Wyszukanie wszystkich klientów z aktywnymi przypomnienami na dziś:
-- SELECT 
--     id,
--     first_name,
--     last_name,
--     company_name,
--     status,
--     reminder->>'time' as reminder_time,
--     reminder->>'note' as reminder_note
-- FROM clients 
-- WHERE reminder IS NOT NULL 
-- AND (reminder->>'enabled')::boolean = true 
-- AND reminder->>'date' = CURRENT_DATE::text
-- ORDER BY reminder->>'time'; 