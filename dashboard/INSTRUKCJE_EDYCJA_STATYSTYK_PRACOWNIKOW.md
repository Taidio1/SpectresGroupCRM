# INSTRUKCJE WDROŻENIA: Edycja Statystyk Pracowników

## Przegląd Zmian

Tabela "Statystyki pracowników z prowizją" w sekcji "Raport - Szczegóły" została zmodyfikowana aby:

1. **Pokazywać tylko pracowników** z rolą "pracownik" 
2. **Umożliwiać edycję** ilości klientów i sumy wpłat
3. **Uprościć wyświetlanie** - Canvas/AntyS/Sale i prowizje ustawione na 0

### Nowe Funkcje:
- ✅ **Filtrowanie ról** - tylko użytkownicy z rolą "pracownik"
- ✅ **Edycja inline** - bezpośrednia edycja w tabeli
- ✅ **Zapisywanie do bazy** - zmiany zapisywane w tabeli `employee_stats`
- ✅ **Walidacja uprawnień** - tylko manager/szef/admin mogą edytować
- ✅ **Real-time updates** - natychmiastowe odświeżanie po zapisaniu

## KROK 1: Migracja Bazy Danych

### Wykonaj SQL w Supabase:

**UWAGA: Tabela employee_stats nie istnieje - utwórz ją od nowa:**

```sql
-- Wykonaj całą zawartość pliku: sql/create_employee_stats_complete.sql
```

Ten plik utworzy kompletną tabelę employee_stats z wszystkimi potrzebnymi kolumnami:
- ✅ Podstawowe kolumny (daily_target, commission_rate, monthly_*)
- ✅ Edytowalne kolumny (custom_clients_count, custom_total_payments) 
- ✅ Indeksy dla wydajności
- ✅ Polityki RLS dla bezpieczeństwa
- ✅ Automatyczne dodanie rekordów dla istniejących pracowników

## KROK 2: Weryfikacja Uprawnień

### Sprawdź czy użytkownik ma dostęp:

Funkcja edycji jest dostępna **tylko dla ról**:
- ✅ **manager**
- ✅ **szef** 
- ✅ **admin**

❌ **pracownik** - NIE może edytować statystyk (może tylko przeglądać)

## KROK 3: Testowanie Funkcji

### Sprawdź czy działa:

1. **Zaloguj się jako manager/szef/admin**
2. **Przejdź do Raport → Szczegóły**
3. **Znajdź sekcję "Statystyki pracowników z prowizją"**
4. **Sprawdź czy tabela pokazuje tylko pracowników**

### Oczekiwane Rezultaty:

- ✅ **Tylko pracownicy** w tabeli (role = 'pracownik')
- ✅ **Ikona edycji** (ołówek) w kolumnie "Akcje"
- ✅ **Kolumny edycji**: "Klienci (edycja)" i "Suma wpłat (edycja)"
- ✅ **Canvas/AntyS/Sale** ustawione na 0
- ✅ **Prowizja EUR** ustawiona na 0.00

## KROK 4: Testowanie Edycji

### Test przypadek 1: Rozpoczęcie edycji

1. **Kliknij ikonę edycji** (ołówek) przy dowolnym pracowniku
2. **Sprawdź czy pojawiają się pola input** dla klientów i wpłat
3. **Sprawdź czy przyciski** Zapisz (✓) i Anuluj (✗) są widoczne

### Test przypadek 2: Wprowadzenie danych

1. **Wprowadź liczbę klientów** np. 50
2. **Wprowadź sumę wpłat** np. 15000.50
3. **Kliknij Zapisz** (zielony przycisk)
4. **Sprawdź czy dane zostały zapisane** i tabela się odświeżyła

### Test przypadek 3: Anulowanie edycji

1. **Rozpocznij edycję**
2. **Wprowadź jakieś dane**
3. **Kliknij Anuluj** (przycisk X)
4. **Sprawdź czy zmiany zostały anulowane**

## KROK 5: Sprawdzenie w Bazie Danych

### Zweryfikuj zapis danych:

```sql
-- Sprawdź czy dane zostały zapisane
SELECT 
    es.custom_clients_count,
    es.custom_total_payments,
    es.monthly_canvas,
    es.monthly_antysale,
    es.monthly_sale,
    es.total_commissions,
    u.full_name,
    u.email,
    u.role
FROM employee_stats es
JOIN users u ON es.user_id = u.id
WHERE u.role = 'pracownik'
ORDER BY u.full_name;
```

### Przykład oczekiwanych danych:

| full_name | custom_clients_count | custom_total_payments | total_commissions |
|-----------|---------------------|----------------------|-------------------|
| Jan Kowalski | 50 | 15000.50 | 100.00 |
| Anna Nowak | 35 | 8500.00 | 56.67 |

## KROK 6: Obsługa Błędów

### Problem: "Brak uprawnień do modyfikacji statystyk"

**Rozwiązanie:**
```sql
-- Sprawdź role użytkownika
SELECT id, email, role FROM users WHERE email = 'twoj_email@domain.com';

-- Upewnij się że użytkownik ma rolę: manager, szef lub admin
UPDATE users SET role = 'manager' WHERE email = 'twoj_email@domain.com';
```

### Problem: "relation employee_stats does not exist"

**Rozwiązanie:**
```sql
-- Tabela nie istnieje - wykonaj cały plik tworzenia tabeli
-- Wykonaj sql/create_employee_stats_complete.sql w Supabase

-- Sprawdź czy tabela została utworzona
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'employee_stats';

-- Sprawdź strukturę tabeli
\d employee_stats
```

### Problem: "Nie można zapisać danych"

**Rozwiązanie:**
```sql
-- Sprawdź czy kolumny istnieją
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employee_stats';

-- Sprawdź czy istnieją rekordy dla pracowników
SELECT u.full_name, es.id 
FROM users u 
LEFT JOIN employee_stats es ON u.id = es.user_id 
WHERE u.role = 'pracownik';
```

### Problem: "Tabela pusta - brak pracowników"

**Rozwiązanie:**
```sql
-- Sprawdź czy istnieją użytkownicy z rolą pracownik
SELECT id, full_name, email, role FROM users WHERE role = 'pracownik';

-- Jeśli nie ma, utwórz testowego pracownika
INSERT INTO users (id, email, full_name, role) 
VALUES ('test-worker-id', 'pracownik@test.pl', 'Test Pracownik', 'pracownik');

-- Dodaj statystyki dla pracownika
INSERT INTO employee_stats (user_id, daily_target, commission_rate) 
VALUES ('test-worker-id', 20, 3.0);
```

## KROK 7: API Endpoints

### Wykorzystywane funkcje:

1. **`reportsApi.getEmployeeStats(user)`** - pobiera tylko pracowników
2. **`reportsApi.updateEmployeeClientStats(userId, clientsCount, totalPayments, user)`** - zapisuje edycję

### Przykład użycia w kodzie:

```javascript
// Edycja statystyk pracownika
const handleSave = async () => {
  await reportsApi.updateEmployeeClientStats(
    'user-id',
    50,        // ilość klientów
    15000.50,  // suma wpłat PLN
    currentUser
  )
}
```

## KROK 8: Security & Permissions

### Zabezpieczenia:

1. **Backend validation** - sprawdzanie ról przed każdą operacją
2. **UI restrictions** - ukrywanie przycisków edycji dla pracowników  
3. **Database constraints** - walidacja typów danych (INTEGER, DECIMAL)
4. **Audit trail** - logowanie zmian w statystykach

### RLS (Row Level Security):

```sql
-- Pracownicy mogą tylko odczytywać swoje statystyki
CREATE POLICY pracownik_stats_select ON employee_stats 
FOR SELECT TO authenticated 
USING (
  auth.jwt() ->> 'role' = 'pracownik' AND user_id = auth.uid()
);

-- Manager/szef/admin mogą edytować wszystkie statystyki
CREATE POLICY manager_stats_all ON employee_stats 
FOR ALL TO authenticated 
USING (
  auth.jwt() ->> 'role' IN ('manager', 'szef', 'admin')
);
```

## KROK 9: Monitoring & Analytics

### Metryki do monitorowania:

1. **Częstotliwość edycji** - ile razy manager edytuje statystyki
2. **Zakres wartości** - czy wprowadzane dane są realistyczne
3. **Performance** - czas ładowania tabeli z dużą liczbą pracowników
4. **Error rate** - częstotliwość błędów przy zapisywaniu

### Przykład monitoringu:

```sql
-- Statystyki edycji
SELECT 
    COUNT(*) as total_edits,
    AVG(custom_clients_count) as avg_clients,
    AVG(custom_total_payments) as avg_payments,
    MAX(updated_at) as last_edit
FROM employee_stats 
WHERE custom_clients_count > 0 OR custom_total_payments > 0;
```

## PODSUMOWANIE

✅ **Tabela pracowników** pokazuje tylko użytkowników z rolą "pracownik"  
✅ **Edycja inline** umożliwia szybką modyfikację danych  
✅ **Uprawnienia** zapewniają bezpieczeństwo (tylko manager+)  
✅ **Baza danych** przechowuje custom pola dla edytowalnych danych  
✅ **UI/UX** intuicyjne przyciski edycji, zapisz, anuluj  
✅ **Walidacja** sprawdza poprawność wprowadzanych danych  

**Manager/szef/admin** mogą teraz łatwo modyfikować statystyki pracowników bezpośrednio w interfejsie web! 