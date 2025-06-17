-- Skrypt SQL: Dodanie kolumny języka do tabeli users
-- Data: Grudzień 2024
-- Cel: Obsługa wielojęzyczności aplikacji

-- Dodaj kolumnę language do tabeli users
ALTER TABLE users 
ADD COLUMN language VARCHAR(2) DEFAULT 'pl' CHECK (language IN ('pl', 'en', 'sk'));

-- Dodaj komentarz do kolumny
COMMENT ON COLUMN users.language IS 'Preferowany język użytkownika: pl (Polski), en (English), sk (Slovenčina)';

-- Ustawienie domyślnego języka dla istniejących użytkowników
UPDATE users 
SET language = 'pl' 
WHERE language IS NULL;

-- Pokaż wynik
SELECT id, email, full_name, role, language 
FROM users 
ORDER BY created_at DESC
LIMIT 10; 