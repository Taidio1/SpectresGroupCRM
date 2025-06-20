# 📊 System Statystyk Pracowników - Instrukcje

## 🎯 Przegląd Systemu

System statystyk pracowników to kompleksowe rozwiązanie do śledzenia i analizy wydajności pracowników w aplikacji CRM. Obejmuje:

- **Prowizje i zarobki** - automatyczne obliczanie na podstawie liczby klientów
- **Czas pracy** - śledzenie aktywności i efektywności
- **Zmiany statusów** - monitoring aktywności klientów
- **Cele i osiągnięcia** - system motywacyjny
- **Raporty i rankingi** - analiza wydajności zespołu

## 🗄️ Struktura Bazy Danych

### Tabela główna: `employee_statistics`

```sql
-- Zawiera wszystkie statystyki pracowników
-- Jeden rekord = jeden pracownik w danym okresie
-- Automatyczne obliczenia przez triggery
```

### Pliki SQL:
- `create_employee_statistics_table.sql` - główna tabela
- `employee_statistics_functions.sql` - funkcje pomocnicze

## 🚀 Instalacja

### 1. Uruchom główny skrypt:

```sql
-- W Supabase SQL Editor lub psql
\i dashboard/sql/create_employee_statistics_table.sql
```

### 2. Dodaj funkcje pomocnicze:

```sql
\i employee_statistics_functions.sql
```

### 3. Wygeneruj przykładowe dane (opcjonalnie):

```sql
SELECT generate_sample_data();
```

## 📋 Podstawowe Użycie

### Dodanie statystyk pracownika:

```sql
-- Aktualizuj statystyki dla pracownika
SELECT update_employee_statistics(
    'user-uuid-here'::UUID,
    '2024-12-01'::DATE,
    '2024-12-31'::DATE,
    85,           -- liczba klientów
    12500.00,     -- wpłaty EUR
    9360,         -- minuty pracy
    247           -- aktywności
);
```

### Ustawienie celów:

```sql
-- Ustaw cele dla pracownika
SELECT set_employee_targets(
    'user-uuid-here'::UUID,
    2024,         -- rok
    12,           -- miesiąc
    8,            -- cel dzienny
    176           -- cel miesięczny (opcjonalny)
);
```

### Generowanie rankingu:

```sql
-- Top 10 pracowników w grudniu 2024
SELECT * FROM get_top_employees(2024, 12, 10);
```

### Podsumowanie zespołu:

```sql
-- Statystyki całego zespołu
SELECT * FROM get_team_summary(2024, 12);
```

## 🎯 System Prowizji

| Liczba klientów | Prowizja |
|----------------|----------|
| 0-2 klientów   | 3%       |
| 3-4 klientów   | 6%       |
| 5-6 klientów   | 9%       |
| 7+ klientów    | 12%      |

### Obliczenia automatyczne:

```sql
-- Wszystko obliczane automatycznie przez triggery:
-- commission_rate = calculate_commission_rate(clients_count)
-- commission_eur = total_payments_eur * commission_rate / 100
-- total_earnings_eur = commission_eur + bonus_eur - penalties_eur
```

## ⏰ System Czasu Pracy

### Śledzenie aktywności:

```sql
-- Aktualizuj czas pracy z logów
SELECT update_work_time_from_logs(
    'user-uuid'::UUID,
    '2024-12-15'::DATE
);
```

### Metryki czasu:

- **total_work_minutes** - łączny czas w minutach
- **average_daily_minutes** - średnia dzienna
- **expected_work_minutes** - oczekiwany czas (8h × dni robocze)
- **efficiency_percentage** - efektywność (osiągnięcia vs cele)

## 📊 Widoki i Raporty

### Widok miesięczny:

```sql
-- Wyświetl statystyki miesięczne z formatowaniem
SELECT * FROM monthly_employee_statistics
WHERE period_start >= '2024-12-01';
```

### Ranking prowizji:

```sql
-- Ranking według prowizji w bieżącym miesiącu
SELECT * FROM commission_ranking;
```

### Eksport do JSON:

```sql
-- Wyeksportuj dane do JSON
SELECT export_statistics_json(2024, 12);
```

## 🔧 Integracja z Aplikacją

### TypeScript Interface:

```typescript
interface EmployeeStatistics {
  id: string;
  user_id: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start: string;
  period_end: string;
  
  // Prowizje
  clients_count: number;
  total_payments_eur: number;
  commission_rate: number;
  commission_eur: number;
  
  // Czas pracy
  total_work_minutes: number;
  efficiency_percentage: number;
  total_activities: number;
  
  // Statusy
  status_canvas: number;
  status_sale: number;
  conversion_rate: number;
  
  // Metadane
  created_at: string;
  updated_at: string;
}
```

### API Functions (Supabase):

```typescript
// W lib/supabase.ts
export const employeeStatsApi = {
  // Pobierz statystyki pracownika
  async getEmployeeStats(userId: string, year: number, month: number) {
    const { data, error } = await supabase
      .from('employee_statistics')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'monthly')
      .gte('period_start', `${year}-${month.toString().padStart(2, '0')}-01`)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Aktualizuj statystyki
  async updateStats(userId: string, data: Partial<EmployeeStatistics>) {
    const { error } = await supabase.rpc('update_employee_statistics', {
      p_user_id: userId,
      p_clients_count: data.clients_count,
      p_total_payments_eur: data.total_payments_eur,
      // ... inne parametry
    });
    
    if (error) throw error;
  },

  // Pobierz ranking
  async getTopEmployees(year: number, month: number, limit = 10) {
    const { data, error } = await supabase.rpc('get_top_employees', {
      p_year: year,
      p_month: month,
      p_limit: limit
    });
    
    if (error) throw error;
    return data;
  }
};
```

## 🔄 Automatyzacja

### Codzienne przeliczanie:

```sql
-- Dodaj do cron job lub edge function
SELECT recalculate_all_statistics(
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
);
```

### Trigger na zmiany klientów:

```sql
-- Automatyczna aktualizacja przy zmianie danych klienta
CREATE OR REPLACE FUNCTION trigger_update_employee_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Aktualizuj statystyki właściciela klienta
  PERFORM update_employee_statistics(
    NEW.owner_id,
    date_trunc('month', CURRENT_DATE)::DATE,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_stats_update
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_employee_stats();
```

## 🛡️ Bezpieczeństwo (RLS)

System ma wbudowane Row Level Security:

- **Administratorzy** - pełny dostęp do wszystkich danych
- **Pracownicy** - dostęp tylko do własnych statystyk
- **Tylko administratorzy** - mogą dodawać/edytować dane

### Testowanie uprawnień:

```sql
-- Jako pracownik - widzi tylko swoje dane
SELECT * FROM employee_statistics; 

-- Jako admin - widzi wszystko
SET ROLE admin;
SELECT * FROM employee_statistics;
```

## 📈 Przykłady Zapytań

### Najlepszy pracownik miesiąca:

```sql
SELECT 
    u.raw_user_meta_data->>'full_name' as name,
    es.commission_eur,
    es.efficiency_percentage
FROM employee_statistics es
JOIN auth.users u ON es.user_id = u.id
WHERE es.period_type = 'monthly'
  AND es.period_start = '2024-12-01'
ORDER BY es.commission_eur DESC
LIMIT 1;
```

### Średnia efektywność zespołu:

```sql
SELECT 
    AVG(efficiency_percentage) as avg_efficiency,
    COUNT(*) as total_employees,
    SUM(commission_eur) as total_commission
FROM employee_statistics
WHERE period_type = 'monthly'
  AND period_start = '2024-12-01'
  AND is_active = TRUE;
```

### Pracownicy wymagający wsparcia:

```sql
SELECT 
    u.raw_user_meta_data->>'full_name' as name,
    es.efficiency_percentage,
    es.clients_count,
    es.daily_target - es.daily_achieved as shortage
FROM employee_statistics es
JOIN auth.users u ON es.user_id = u.id
WHERE es.efficiency_percentage < 80
  AND es.period_start = '2024-12-01'
ORDER BY es.efficiency_percentage ASC;
```

## 🔍 Troubleshooting

### Częste problemy:

1. **Brak danych**: Sprawdź czy triggery działają
2. **Nieprawidłowe prowizje**: Sprawdź funkcję `calculate_commission_rate`
3. **Problemy z RLS**: Sprawdź uprawnienia użytkownika

### Debugowanie:

```sql
-- Sprawdź triggery
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'employee_statistics';

-- Sprawdź funkcje
SELECT proname FROM pg_proc WHERE proname LIKE '%employee%';

-- Sprawdź polityki RLS
SELECT * FROM pg_policies WHERE tablename = 'employee_statistics';
```

## 📞 Wsparcie

W przypadku problemów:
1. Sprawdź logi Supabase
2. Przetestuj funkcje na przykładowych danych
3. Sprawdź uprawnienia użytkowników
4. Skontaktuj się z administratorem systemu

---

**Utworzono**: Grudzień 2024  
**Wersja**: 1.0  
**Status**: Produkcyjny 