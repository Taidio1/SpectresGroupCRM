# INSTRUKCJE WDROŻENIA: Plan Dnia z Rzeczywistymi Przypomnieniami

## Przegląd Zmian

Sekcja "Plan dnia" w dashboardzie została zmodyfikowana aby pokazywać **rzeczywistych klientów z bazy danych** z ustawionymi przypomnieniami zamiast mockowanych danych.

### Nowe Funkcje:
1. **Rzeczywiste przypomnienia** - pobierane z bazy danych
2. **Automatyczne grupowanie** - klienci są automatycznie przypisywani do slotów czasowych na podstawie:
   - Godziny przypomnienia
   - Statusu klienta (canvas, sale, antysale)
3. **Live aktualizacje** - przycisk odświeżania danych w czasie rzeczywistym
4. **Szczegółowe informacje** - każdy klient pokazuje:
   - Imię i nazwisko
   - Firmę
   - Godzinę przypomnienia
   - Notatkę przypomnienia
   - Aktualny status

## KROK 1: Migracja Bazy Danych

### Wykonaj SQL w Supabase:

```sql
-- Wykonaj całą zawartość pliku: sql/add_reminder_column.sql
```

Albo bezpośrednio:

```sql
-- 1. Dodaj kolumnę reminder jako JSONB
ALTER TABLE clients 
ADD COLUMN reminder JSONB DEFAULT NULL;

-- 2. Dodaj indeksy dla wydajności
CREATE INDEX idx_clients_reminder_date ON clients 
USING BTREE ((reminder->>'date')) 
WHERE reminder IS NOT NULL AND (reminder->>'enabled')::boolean = true;

-- 3. Dodaj walidację formatu
CREATE OR REPLACE FUNCTION validate_reminder_format(reminder_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    IF reminder_data IS NULL THEN RETURN TRUE; END IF;
    
    IF NOT (
        reminder_data ? 'enabled' AND
        reminder_data ? 'date' AND
        reminder_data ? 'time' AND
        reminder_data ? 'note'
    ) THEN RETURN FALSE; END IF;
    
    IF NOT (
        (reminder_data->>'enabled')::text IN ('true', 'false') AND
        (reminder_data->>'date')::text ~ '^\d{4}-\d{2}-\d{2}$' AND
        (reminder_data->>'time')::text ~ '^\d{2}:\d{2}$'
    ) THEN RETURN FALSE; END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE clients 
ADD CONSTRAINT check_reminder_format 
CHECK (validate_reminder_format(reminder));
```

## KROK 2: Testowe Przypomnienia

### Dodaj testowe przypomnienia na dziś:

```sql
-- Dodaj przypomnienia na bieżącą datę dla testów
UPDATE clients 
SET reminder = jsonb_build_object(
    'enabled', true,
    'date', CURRENT_DATE::text,
    'time', '09:00',
    'note', 'Testowe przypomnienie - canvas'
)
WHERE status = 'canvas' 
LIMIT 2;

UPDATE clients 
SET reminder = jsonb_build_object(
    'enabled', true,
    'date', CURRENT_DATE::text,
    'time', '11:00',
    'note', 'Testowe przypomnienie - sale'
)
WHERE status = 'sale' 
LIMIT 2;

UPDATE clients 
SET reminder = jsonb_build_object(
    'enabled', true,
    'date', CURRENT_DATE::text,
    'time', '14:00',
    'note', 'Testowe przypomnienie - antysale'
)
WHERE status = 'antysale' 
LIMIT 2;
```

## KROK 3: Weryfikacja w Aplikacji

### Sprawdź czy działa:

1. **Zaloguj się jako PRACOWNIK** (tylko pracownicy widzą Plan dnia)
2. **Przejdź do Dashboard**
3. **Sprawdź sekcję "Plan dnia - Kalendarz"**

### Oczekiwane Rezultaty:

- ✅ **Loading Spinner** podczas ładowania
- ✅ **Rzeczywisci klienci** z bazy danych
- ✅ **Sloty czasowe** z klientami pogrupowanymi według:
  - `8:00 - 10:00` → Canvas
  - `10:10 - 12:00` → Sales 
  - `12:30 - 15:00` → Antysales
  - `15:10 - 16:30` → Canvas + Sales
- ✅ **Szczegóły klienta**: imię, firma, godzina, notatka, status
- ✅ **Przycisk odświeżania** (ikona kalendarza)
- ✅ **Bieżąca data** w nagłówku

## KROK 4: Integracja z Tabelą Klientów

### Przypomnienia będą automatycznie synchronizowane:

- **Dodawanie** przypomnienia w tabeli klientów → automatycznie pojawi się w Planie dnia
- **Modyfikacja** daty/godziny → automatycznie zaktualizuje slot czasowy
- **Wyłączenie** przypomnienia → automatycznie zniknie z Planu dnia

### Uwaga: Tabela klientów już ma UI dla przypomnień!
W `components/clients-table.tsx` już istnieje interfejs do zarządzania przypomnienami - zostanie automatycznie podłączony do nowej kolumny.

## KROK 5: Troubleshooting

### Problem: "Brak przypomnień na dziś"

**Rozwiązanie:**
```sql
-- Sprawdź czy istnieją przypomnienia
SELECT 
    first_name, last_name, company_name,
    reminder
FROM clients 
WHERE reminder IS NOT NULL;

-- Sprawdź czy są przypomnienia na dziś
SELECT 
    first_name, last_name,
    reminder->>'date' as reminder_date,
    reminder->>'time' as reminder_time,
    reminder->>'enabled' as enabled
FROM clients 
WHERE reminder IS NOT NULL 
AND reminder->>'date' = CURRENT_DATE::text;
```

### Problem: Błędy TypeScript

**Rozwiązanie:**
```bash
# Restart TypeScript Server w VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Problem: Real-time nie działa

**Rozwiązanie:**
- Kliknij przycisk odświeżania (ikona kalendarza) w sekcji Plan dnia
- Dane będą pobrane na świeżo z bazy

## KROK 6: Produkcja

### W środowisku produkcyjnym:

1. **Wykonaj migrację** podczas okna maintenance
2. **Dodaj RLS policies** jeśli potrzebne:

```sql
-- Opcjonalnie: RLS dla kolumny reminder
-- (domyślnie dziedziczy z istniejących policies dla tabeli clients)
```

3. **Monitoruj wydajność** indeksów JSONB
4. **Skonfiguruj backup** przed migracją

## KROK 7: Dalszy Rozwój

### Możliwe ulepszenia:

1. **Notyfikacje Push** - przypomnienia w przeglądarce
2. **Email reminders** - automatyczne wysyłanie maili
3. **Recurring reminders** - cykliczne przypomnienia
4. **Calendar integration** - eksport do Google Calendar
5. **Mobile notifications** - powiadomienia mobilne

### Przykład dodania powiadomień:

```javascript
// Dodaj do dashboard.tsx
const scheduleNotification = (client, reminderTime) => {
  if ("Notification" in window) {
    new Notification(`Przypomnienie: ${client.first_name} ${client.last_name}`, {
      body: client.reminder.note,
      icon: '/favicon.ico'
    })
  }
}
```

## PODSUMOWANIE

✅ **Plan dnia** pokazuje rzeczywistych klientów z bazy danych  
✅ **Przypomnienia** są przechowywane w tabeli `clients` jako JSONB  
✅ **Automatyczne grupowanie** według slotów czasowych i statusów  
✅ **Real-time aktualizacje** z przyciskiem odświeżania  
✅ **Pełna integracja** z istniejącą tabelą klientów  

**Pracownicy** mogą teraz efektywnie planować swój dzień pracy na podstawie rzeczywistych przypomnień ustawionych dla klientów! 