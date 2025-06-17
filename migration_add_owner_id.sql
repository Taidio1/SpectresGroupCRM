-- Migration: add_owner_id_to_clients
-- Opis: Dodanie kolumny owner_id do tabeli clients oraz włączenie RLS dla systemu uprawnień
-- Data: 2024-06-XX
-- Zgodnie z: StrukturaDB.txt

-- 1. Dodanie kolumny owner_id do tabeli clients (tylko jeśli nie istnieje)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'owner_id') THEN
        ALTER TABLE clients ADD COLUMN owner_id UUID REFERENCES users(id);
    END IF;
END $$;

-- 2. Indeksy dla wydajności (tylko jeśli nie istnieją)
DO $$ 
BEGIN
    -- Indeks dla owner_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clients_owner_id') THEN
        CREATE INDEX idx_clients_owner_id ON clients(owner_id);
    END IF;
    
    -- Indeks dla edited_by (sprawdzamy czy już istnieje)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clients_edited_by') THEN
        CREATE INDEX idx_clients_edited_by ON clients(edited_by);
    END IF;
END $$;

-- 3. Ustaw właściciela na podstawie edited_by dla istniejących rekordów
-- edited_by jest już UUID więc można go bezpośrednio użyć jako owner_id
UPDATE clients 
SET owner_id = edited_by
WHERE edited_by IS NOT NULL AND owner_id IS NULL;

-- 4. Włączenie RLS (Row Level Security) na tabeli clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 5. Usunięcie istniejących polityk (jeśli istnieją) przed dodaniem nowych
DROP POLICY IF EXISTS pracownik_clients_select ON clients;
DROP POLICY IF EXISTS pracownik_clients_update ON clients;
DROP POLICY IF EXISTS pracownik_clients_insert ON clients;
DROP POLICY IF EXISTS manager_szef_clients_select ON clients;
DROP POLICY IF EXISTS manager_szef_clients_update ON clients;
DROP POLICY IF EXISTS manager_szef_clients_insert ON clients;
DROP POLICY IF EXISTS manager_szef_clients_delete ON clients;
DROP POLICY IF EXISTS admin_clients_all ON clients;

-- 6. Polityki RLS dla różnych ról użytkowników

-- Polityka dla pracowników - widzi tylko swoich klientów i ogólnych
CREATE POLICY pracownik_clients_select ON clients 
FOR SELECT TO authenticated 
USING (
  (auth.jwt() ->> 'role' = 'pracownik') AND 
  (owner_id = auth.uid() OR owner_id IS NULL OR edited_by = auth.uid())
);

-- Polityka dla pracowników - może edytować WSZYSTKICH klientów
CREATE POLICY pracownik_clients_update ON clients 
FOR UPDATE TO authenticated 
USING (
  auth.jwt() ->> 'role' = 'pracownik'
);

-- Polityka dla pracowników - może wstawiać nowych klientów
CREATE POLICY pracownik_clients_insert ON clients 
FOR INSERT TO authenticated 
WITH CHECK (
  (auth.jwt() ->> 'role' = 'pracownik') AND 
  (owner_id = auth.uid())
);

-- UWAGA: Pracownik NIE MA polityki DELETE - nie może usuwać klientów!

-- Polityka dla manager/szef - widzi wszystkich klientów
CREATE POLICY manager_szef_clients_select ON clients 
FOR SELECT TO authenticated 
USING (
  auth.jwt() ->> 'role' IN ('manager', 'szef')
);

-- Polityka dla manager/szef - może edytować wszystkich klientów
CREATE POLICY manager_szef_clients_update ON clients 
FOR UPDATE TO authenticated 
USING (
  auth.jwt() ->> 'role' IN ('manager', 'szef')
);

-- Polityka dla manager/szef - może wstawiać nowych klientów
CREATE POLICY manager_szef_clients_insert ON clients 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.jwt() ->> 'role' IN ('manager', 'szef')
);

-- Polityka dla manager/szef - może usuwać klientów
CREATE POLICY manager_szef_clients_delete ON clients 
FOR DELETE TO authenticated 
USING (
  auth.jwt() ->> 'role' IN ('manager', 'szef')
);

-- Polityka dla admin - pełny dostęp do wszystkiego
CREATE POLICY admin_clients_all ON clients 
FOR ALL TO authenticated 
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- 7. Komentarze do dokumentacji
COMMENT ON COLUMN clients.owner_id IS 'ID użytkownika będącego właścicielem klienta - używane do kontroli uprawnień';
COMMENT ON TABLE clients IS 'Tabela klientów z włączonym RLS dla kontroli uprawnień na podstawie ról użytkowników. PRACOWNIK: edycja wszystkich, brak usuwania. MANAGER/SZEF: pełne uprawnienia. ADMIN: wszystko.';

-- 8. Sprawdzenie czy migracja się powiodła
DO $$ 
BEGIN
    -- Sprawdź czy kolumna owner_id została dodana
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'clients' AND column_name = 'owner_id') THEN
        RAISE NOTICE 'SUCCESS: Kolumna owner_id została dodana do tabeli clients';
    ELSE
        RAISE EXCEPTION 'ERROR: Kolumna owner_id nie została dodana';
    END IF;
    
    -- Sprawdź czy RLS jest włączone
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clients' AND rowsecurity = true) THEN
        RAISE NOTICE 'SUCCESS: RLS zostało włączone na tabeli clients';
    ELSE
        RAISE WARNING 'WARNING: RLS może nie być włączone na tabeli clients';
    END IF;
    
    -- Sprawdź ile rekordów ma przypisanego właściciela
    DECLARE
        records_with_owner INTEGER;
        total_records INTEGER;
    BEGIN
        SELECT COUNT(*) INTO records_with_owner FROM clients WHERE owner_id IS NOT NULL;
        SELECT COUNT(*) INTO total_records FROM clients;
        
        RAISE NOTICE 'INFO: % z % klientów ma przypisanego właściciela', records_with_owner, total_records;
    END;
    
    RAISE NOTICE 'MIGRACJA ZAKOŃCZONA POMYŚLNIE!';
    RAISE NOTICE 'UPRAWNIENIA: Pracownik może edytować wszystkich klientów ale NIE MOŻE usuwać!';
END $$;

-- KONIEC MIGRACJI