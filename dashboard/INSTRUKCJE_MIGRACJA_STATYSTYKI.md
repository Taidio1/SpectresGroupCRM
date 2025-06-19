# 📊 Migracja: Tabela Statystyk Pracowników z Prowizją

## 🎯 Cel
Dodanie nowej tabeli `employee_stats` dla przechowywania statystyk pracowników z systemem prowizji i kar zgodnym z wymaganiami biznesowymi.

## 🔧 Kroki wdrażania

### 1. Uruchomienie migracji SQL
```bash
# W Supabase Dashboard > SQL Editor wykonaj plik:
sql/create_employee_stats.sql
```

### 2. Sprawdzenie poprawności
Po wykonaniu migracji sprawdź w Supabase Dashboard:

**Tabela `employee_stats`:**
- ✅ `id` - UUID (PK)
- ✅ `user_id` - UUID (FK do users)
- ✅ `daily_target` - INTEGER (default: 20)
- ✅ `commission_rate` - DECIMAL(4,2) (default: 3.0)
- ✅ `monthly_canvas` - INTEGER (default: 0)
- ✅ `monthly_antysale` - INTEGER (default: 0)
- ✅ `monthly_sale` - INTEGER (default: 0)
- ✅ `total_commissions` - DECIMAL(10,2) (default: 0)
- ✅ `total_penalties` - DECIMAL(10,2) (default: 0)

**Polityki RLS:**
- ✅ Pracownicy widzą tylko swoje statystyki
- ✅ Manager/Szef/Admin mogą modyfikować wszystkie
- ✅ Tylko Admin może usuwać

### 3. Weryfikacja danych
```sql
-- Sprawdź czy rekordy zostały utworzone dla istniejących użytkowników
SELECT 
    es.*,
    u.full_name,
    u.role
FROM employee_stats es
JOIN users u ON es.user_id = u.id
ORDER BY u.role DESC, u.full_name;
```

## 🚀 Nowe funkcjonalności

### Dla Manager/Szef/Admin:
- **Tabela statystyk pracowników** - widoczna tylko dla uprzywilejowanych ról
- **Rzeczywiste dane z DB** zamiast statycznych przykładów
- **System prowizji** - obliczana na podstawie miesięcznych wyników
- **System kar** - 15 EUR za każdy brak do normy dziennej (20)
- **Norma 20/20/20** - wizualny progress bar i status
- **Wyszukiwanie i sortowanie** pracowników

### System obliczania:
- **Dzisiejsze statystyki** - pobierane z tabeli `clients` dla bieżącego dnia
- **Wczorajsze braki** - sprawdzane dla naliczania kar
- **Miesięczne C/AS/S** - zliczane od 1. dnia miesiąca
- **Prowizje EUR** - obliczane dynamicznie na podstawie ustawionego %

## 📋 Testowanie

### 1. Dostęp do tabeli
```sql
-- Zaloguj się jako manager/szef/admin i sprawdź:
SELECT * FROM employee_stats;
```

### 2. Test uprawnień
```sql
-- Jako pracownik powinieneś widzieć tylko swoje dane:
SELECT * FROM employee_stats WHERE user_id = auth.uid();
```

### 3. Test UI
1. Zaloguj się jako **manager/szef/admin**
2. Przejdź do **Raport > Szczegóły**
3. Sprawdź czy widać tabelę "Statystyki pracowników z prowizją"
4. Przetestuj wyszukiwanie i sortowanie

## 🔄 Automatyzacja (opcjonalnie)

### Cronjob dla aktualizacji statystyk
```sql
-- Funkcja do automatycznego przeliczania miesięcznych statystyk
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS void AS $$
BEGIN
    UPDATE employee_stats 
    SET 
        monthly_canvas = (
            SELECT COUNT(*) FROM clients 
            WHERE edited_by = employee_stats.user_id 
            AND status = 'canvas'
            AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())
        ),
        monthly_antysale = (
            SELECT COUNT(*) FROM clients 
            WHERE edited_by = employee_stats.user_id 
            AND status = 'antysale'
            AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())
        ),
        monthly_sale = (
            SELECT COUNT(*) FROM clients 
            WHERE edited_by = employee_stats.user_id 
            AND status = 'sale'
            AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())
        );
END;
$$ LANGUAGE plpgsql;

-- Uruchomienie raz dziennie:
-- SELECT cron.schedule('update-monthly-stats', '0 1 * * *', 'SELECT update_monthly_stats();');
```

## 🎨 UI Komponenty

### Nowe elementy interfejsu:
- **Progress bar** - norma 20/20/20 z kolorowym wskaźnikiem
- **Badges** - Canvas (niebieski), AntyS (pomarańczowy), Sale (zielony)
- **Status** - ✅ Norma OK / ❌ Brak X
- **Avatary pracowników** - z inicjałami jako fallback
- **Podsumowania** - łączne prowizje, kary, pracownicy w normie
- **Legenda** - wyjaśnienie systemu prowizji i kar

## 🔒 Bezpieczeństwo

- **RLS polityki** - zapewniają dostęp tylko uprawnianym rolom
- **Walidacja API** - sprawdzanie uprawnień w reportsApi
- **UI ukrywanie** - tabela niewidoczna dla pracowników
- **Audyt działań** - wszystkie zmiany logowane

## 🚨 Rozwiązywanie problemów

### Brak danych w tabeli statystyk:
```sql
-- Dodaj rekordy ręcznie dla nowych użytkowników:
INSERT INTO employee_stats (user_id, daily_target, commission_rate)
SELECT id, 20, 3.0 FROM users WHERE role = 'pracownik'
ON CONFLICT (user_id) DO NOTHING;
```

### Błędy uprawnień:
```sql
-- Sprawdź polityki RLS:
SELECT * FROM pg_policies WHERE tablename = 'employee_stats';
```

### Brak danych w UI:
1. Sprawdź console.log w przeglądarce
2. Sprawdź czy użytkownik ma rolę manager/szef/admin
3. Sprawdź network requests w DevTools

---

**✅ Po wdrożeniu tej migracji system będzie używał prawdziwych danych z bazy zamiast statycznych przykładów!** 