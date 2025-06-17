# Test Plan: Client Edit Functionality

## Problemy do przetestowania:
1. ✅ **Logi edycji nie są zapisywane** - Po edycji klienta nie pojawiają się wpisy w historii zmian
2. ✅ **Avatar właściciela nie jest wyświetlany** - Po automatycznym przypisaniu właściciela avatar nie jest widoczny

## Wprowadzone naprawki:

### 1. Naprawienie funkcji zapisywania (`handleSave`)
- Dodano odświeżanie historii klienta po zapisaniu zmian
- Usunięto automatyczne zamykanie dialogu aby użytkownik mógł zobaczyć zaktualizowaną historię
- Dodano opóźnienie 500ms aby triggery bazy danych zdążyły się wykonać

### 2. Ulepszenie funkcji `fetchClientHistory`
- Dodano automatyczne przewijanie do najnowszych wpisów po odświeżeniu
- Ulepszono logowanie dla lepszego debugowania

### 3. Nowy skrypt SQL: `fix_client_logs_and_avatar.sql`
- Kompletny trigger do logowania wszystkich zmian w tabeli `clients`
- Naprawione polityki RLS dla tabeli `activity_logs`
- Funkcje testowe do weryfikacji działania

### 4. Dodany przycisk odświeżania historii
- Użytkownik może ręcznie odświeżyć historię zmian
- Przycisk z animacją ładowania

## Kroki testowe:

### Test 1: Logowanie zmian statusu
1. Otwórz edycję klienta
2. Zmień status (np. z "canvas" na "sale")
3. Kliknij "Zapisz zmiany"
4. **Oczekiwany rezultat**: W historii powinien pojawić się nowy wpis o zmianie statusu

### Test 2: Logowanie zmian danych kontaktowych
1. Otwórz edycję klienta
2. Zmień telefon lub email
3. Kliknij "Zapisz zmiany"
4. **Oczekiwany rezultat**: W historii powinien pojawić się wpis o zmianie telefonu/emaila

### Test 3: Automatyczne przypisanie właściciela
1. Zaloguj się jako pracownik
2. Otwórz edycję klienta bez właściciela (avatar z "?")
3. Zmień status klienta
4. Kliknij "Zapisz zmiany"
5. **Oczekiwany rezultat**: 
   - Klient zostanie automatycznie przypisany do pracownika
   - Avatar właściciela powinien się pojawić w tabeli
   - W historii powinien być wpis o zmianie `owner_id`

### Test 4: Wyświetlanie avatara właściciela
1. Sprawdź kolumnę "Właściciel" w tabeli klientów
2. **Oczekiwany rezultat**: 
   - Klienci z przypisanym właścicielem powinni mieć avatar
   - Najechanie na avatar powinno pokazać tooltip z danymi właściciela
   - Klienci bez właściciela powinni mieć placeholder "?"

### Test 5: Ręczne odświeżanie historii
1. Otwórz edycję klienta
2. Dokonaj zmian i zapisz
3. Kliknij przycisk odświeżania (ikona strzałek) obok "Historia zmian"
4. **Oczekiwany rezultat**: Historia powinna się odświeżyć i pokazać najnowsze zmiany

## Uruchomienie naprawek:

### 1. Kod TypeScript/React jest już zaktualizowany

### 2. SQL należy uruchomić w bazie danych:
```sql
-- Uruchom plik: fix_client_logs_and_avatar.sql
-- Lub skopiuj zawartość i wykonaj w Supabase SQL Editor
```

### 3. Testy SQL do uruchomienia:
```sql
-- Test funkcjonalności logowania
SELECT * FROM test_activity_logs_functionality();

-- Test klientów z avatarami
SELECT * FROM test_clients_with_avatars();

-- Sprawdź ostatnie logi
SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 5;
```

## Znane ograniczenia:
- Triggery działają tylko gdy użytkownik jest prawidłowo zalogowany w Supabase Auth
- Avatar może się nie odświeżyć natychmiast - użyj przycisku odświeżania historii
- Dialog edycji nie zamyka się automatycznie po zapisaniu (celowe, aby pokazać zaktualizowaną historię) 