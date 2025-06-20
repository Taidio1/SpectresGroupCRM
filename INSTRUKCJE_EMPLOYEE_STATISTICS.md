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

Zawiera wszystkie statystyki pracowników:
- Jeden rekord = jeden pracownik w danym okresie
- Automatyczne obliczenia przez triggery
- System prowizji oparty na liczbie klientów

### Pliki SQL:
- `create_employee_statistics_table.sql` - główna tabela
- `employee_statistics_functions.sql` - funkcje pomocnicze

## 🚀 Instalacja

### 1. Uruchom główny skrypt:
```sql
-- W Supabase SQL Editor
\i dashboard/sql/create_employee_statistics_table.sql
```

### 2. Dodaj funkcje pomocnicze:
```sql
\i employee_statistics_functions.sql
```

### 3. Wygeneruj przykładowe dane:
```sql
SELECT generate_sample_data();
```

## 📋 Podstawowe Użycie

### Dodanie statystyk:
```sql
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

### Ranking pracowników:
```sql
SELECT * FROM get_top_employees(2024, 12, 10);
```

## 🎯 System Prowizji

| Liczba klientów | Prowizja |
|----------------|----------|
| 0-2 klientów   | 3%       |
| 3-4 klientów   | 6%       |
| 5-6 klientów   | 9%       |
| 7+ klientów    | 12%      |

Wszystkie obliczenia są automatyczne przez triggery.

## 🔧 Integracja z Aplikacją

```typescript
// TypeScript Interface
interface EmployeeStatistics {
  id: string;
  user_id: string;
  clients_count: number;
  total_payments_eur: number;
  commission_rate: number;
  commission_eur: number;
  efficiency_percentage: number;
  total_activities: number;
  // ... inne pola
}

// API funkcje w lib/supabase.ts
export const employeeStatsApi = {
  async getEmployeeStats(userId: string, year: number, month: number) {
    const { data, error } = await supabase
      .from('employee_statistics')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'monthly')
      .single();
    
    return data;
  },

  async updateStats(userId: string, data: Partial<EmployeeStatistics>) {
    const { error } = await supabase.rpc('update_employee_statistics', {
      p_user_id: userId,
      p_clients_count: data.clients_count,
      p_total_payments_eur: data.total_payments_eur
    });
  }
};
```

## 🛡️ Bezpieczeństwo (RLS)

- **Administratorzy** - pełny dostęp
- **Pracownicy** - tylko własne dane
- **Automatyczne policy** dla ról

## 📈 Przykłady Zapytań

### Najlepszy pracownik:
```sql
SELECT 
    u.raw_user_meta_data->>'full_name' as name,
    es.commission_eur
FROM employee_statistics es
JOIN auth.users u ON es.user_id = u.id
ORDER BY es.commission_eur DESC
LIMIT 1;
```

### Średnia zespołu:
```sql
SELECT 
    AVG(efficiency_percentage) as avg_efficiency,
    COUNT(*) as total_employees
FROM employee_statistics
WHERE period_start = '2024-12-01';
```

---
**Status**: Gotowy do użycia ✅ 