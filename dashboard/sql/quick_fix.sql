-- SZYBKIE ROZWIĄZANIE: Dodaj brakującą kolumnę status_changed_at

ALTER TABLE clients 
ADD COLUMN status_changed_at TIMESTAMPTZ;

-- Sprawdź czy działa
SELECT * FROM clients LIMIT 1; 