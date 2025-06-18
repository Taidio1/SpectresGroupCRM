-- Dodaj kolumnę status_changed_at do tabeli clients
-- Ta kolumna będzie śledzić czas ostatniej zmiany statusu klienta

ALTER TABLE clients 
ADD COLUMN status_changed_at TIMESTAMPTZ;

-- Dodaj komentarz do kolumny
COMMENT ON COLUMN clients.status_changed_at IS 'Czas ostatniej zmiany statusu klienta (dla systemu powiadomień canvas)';

-- Opcjonalnie: ustaw status_changed_at na updated_at dla istniejących klientów ze statusem canvas
-- (to da im bazowy punkt startowy dla systemu kolorowania)
UPDATE clients 
SET status_changed_at = updated_at 
WHERE status = 'canvas' AND status_changed_at IS NULL;

-- Dodaj indeks dla lepszej wydajności przy zapytaniach o klientów canvas
CREATE INDEX idx_clients_status_changed_at 
ON clients(status, status_changed_at) 
WHERE status = 'canvas';

-- Opcjonalnie: stwórz funkcję trigger do automatycznego ustawiania status_changed_at
-- gdy status się zmienia (alternatywa dla logiki w aplikacji)
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Jeśli status się zmienił, ustaw status_changed_at
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_changed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dodaj trigger do tabeli clients
DROP TRIGGER IF EXISTS trigger_update_status_changed_at ON clients;
CREATE TRIGGER trigger_update_status_changed_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_status_changed_at();

-- Sprawdź czy kolumna została dodana poprawnie
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'status_changed_at'; 