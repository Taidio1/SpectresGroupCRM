# 🤖 Automatyczne Zarządzanie Statusem Klientów

## 🎯 Cel Systemu

Automatyzuje zarządzanie statusami klientów w CRM na podstawie czasu i aktywności, aby zapewnić właściwą obsługę i przypisanie właścicieli.

## 📋 Implementowane Funkcjonalności

### 1. **Automatyczna Zmiana Statusu**
- **Reguła**: Jeśli klient ma status "canvas" przez 2 dni → automatycznie zmień na "antysale"
- **Wizualne**: Kolor rekordu zmienia się na lekko żółty (`bg-yellow-100`)

### 2. **Ostrzeżenia o Braku Kontaktu**
- **Dzień 4**: Rekord staje się pomarańczowy (`bg-orange-200`)
- **Dzień 5**: Rekord staje się czerwony (`bg-red-200`)
- **Liczenie**: Od ostatniego kliknięcia w numer telefonu

### 3. **Reset Właściciela**
- **Reguła**: Po 5 dniach bez kliknięcia telefonu → `owner_id = NULL`
- **Wskaźnik**: Ikona ostrzeżenia przy kliencie bez właściciela

## 🛠️ Implementacja Techniczna

### Nowe Pola w Bazie Danych

```sql
-- Dodane do tabeli clients
ALTER TABLE clients ADD COLUMN last_phone_click TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN status_changed_at TIMESTAMPTZ;
```

### API Routes

#### 1. CRON Job (Główny System)
```
POST /api/cron/client-status-management
```
- Uruchamiany codziennie automatycznie
- Przetwarza wszystkich klientów ze statusem "canvas"
- Aktualizuje statusy i resetuje właścicieli

#### 2. Test Manualny
```
GET /api/manual-client-status-check
```
- Pozwala ręcznie przetestować system
- Wywołuje CRON job od ręki

### Funkcje w Kodzie

#### 1. Tracking Kliknięć Telefonu
```typescript
// Automatycznie wywołane przy każdym kliknięciu numeru telefonu
await clientsApi.updateLastPhoneClick(clientId, user)
```

#### 2. Dynamiczne Kolorowanie Wierszy
```typescript
const getRowBackgroundColor = (client) => {
  // Sprawdza daty i zwraca odpowiedni kolor CSS
}
```

#### 3. Wskaźnik Braku Właściciela
```typescript
const hasNoOwner = (client) => {
  return !client.owner_id || client.owner_id === null
}
```

## 📅 Harmonogram Działania

### Dzień 1 (Status: canvas)
- ✅ Klient otrzymuje status "canvas"
- ✅ Ustawiane jest `status_changed_at`
- 🎨 **Kolor**: Normalny (bez specjalnych oznaczeń)

### Dzień 2
- 🤖 **Automatyczna akcja**: Status zmienia się na "antysale"
- 🎨 **Kolor**: Lekko żółty (`bg-yellow-100`)

### Dzień 4 (Brak kontaktu)
- ⚠️ **Ostrzeżenie**: Brak kliknięcia w telefon od zmiany statusu
- 🎨 **Kolor**: Pomarańczowy (`bg-orange-200`)

### Dzień 5 (Krytyczny)
- 🚨 **Krytyczne**: Dalej brak kontaktu
- 🎨 **Kolor**: Czerwony (`bg-red-200`)
- 🤖 **Automatyczna akcja**: Reset `owner_id = NULL`

## 🎨 Kolory i Wskaźniki

### Kolory Wierszy
```css
/* Canvas → Antysale (po 2 dniach) */
bg-yellow-100 dark:bg-yellow-900/20

/* Ostrzeżenie dzień 2-3 */
bg-yellow-200 dark:bg-yellow-900/30

/* Ostrzeżenie dzień 4 */
bg-orange-200 dark:bg-orange-900/30

/* Krytyczne dzień 5+ */
bg-red-200 dark:bg-red-900/30
```

### Ikony Ostrzeżeń
- 🟡 **AlertCircle**: Brak właściciela
- 🔶 **Pomarańczowy**: Ostrzeżenie o braku kontaktu
- 🔴 **Czerwony**: Krytyczny brak kontaktu

## 📊 Logging i Monitorowanie

### Activity Logs
Wszystkie automatyczne akcje są logowane:
```javascript
{
  action: 'AUTO_STATUS_CHANGE',
  table_name: 'clients',
  record_id: clientId,
  old_values: { status: 'canvas' },
  new_values: { status: 'antysale' },
  user_id: null, // System action
  details: 'Automatyczna zmiana statusu z canvas na antysale po 2.1 dniach'
}
```

### Console Logs
```
🤖 Rozpoczynam automatyczne zarządzanie statusem klientów...
📊 Znaleziono 15 klientów canvas do sprawdzenia
🔄 Zmieniam status klienta Jan Kowalski z canvas na antysale (2.1 dni)
🔄 Resetuję owner_id klienta Anna Nowak (brak kontaktu przez 5.2 dni)
✅ Zakończono automatyczne zarządzanie statusem klientów
📊 Wyniki: 15 przetworzono, 3 zmian statusu, 1 reset właściciela, 0 błędów
```

## 🧪 Testowanie

### 1. Ręczne Testowanie
```bash
# Wywołaj ręcznie przez API
curl -X GET https://your-domain.com/api/manual-client-status-check
```

### 2. Symulacja Dat (Development)
```javascript
// W development można zmienić daty dla testów
const now = new Date('2024-12-15') // Symuluj przyszłą datę
```

### 3. Sprawdzanie Logów
```javascript
// W konsoli przeglądarki
console.log('Last phone click tracking aktywny')
```

## ⚙️ Konfiguracja CRON

### Vercel (Produkcja)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/client-status-management",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Lokalne Testowanie
```bash
# Wywołaj raz dziennie rano o 9:00
0 9 * * * curl -X POST http://localhost:3000/api/cron/client-status-management
```

## 🚀 Włączenie w Produkcji

### 1. Migracja Bazy Danych
```bash
# Uruchom migrację
psql -f dashboard/sql/add_last_phone_click.sql
```

### 2. Deploy Aplikacji
```bash
# Po deploy automatycznie są dostępne API routes
npm run build
npm run start
```

### 3. Konfiguracja CRON
- Dodaj `vercel.json` z konfiguracją CRON
- Lub skonfiguruj zewnętrzny CRON do wywoływania API

## 🛡️ Zabezpieczenia

### 1. Autoryzacja API
- API routes są chronione przez Supabase Auth
- Sprawdzanie uprawnień użytkownika

### 2. Obsługa Błędów
- Graceful handling błędów bazy danych
- Kontynuacja działania przy częściowych błędach
- Szczegółowe logowanie problemów

### 3. Rollback
```sql
-- W razie potrzeby można cofnąć zmiany
UPDATE clients SET status_changed_at = NULL WHERE status_changed_at IS NOT NULL;
UPDATE clients SET last_phone_click = NULL WHERE last_phone_click IS NOT NULL;
```

## 📈 Monitoring Skuteczności

### Metryki do Śledzenia
- Liczba automatycznych zmian statusu dziennie
- Liczba resetów właścicieli
- Średni czas do pierwszego kontaktu po canvas
- Skuteczność systemu ostrzeżeń

### Raporty
```sql
-- Dzienne podsumowanie automatycznych akcji
SELECT 
  DATE(timestamp) as date,
  action,
  COUNT(*) as count
FROM activity_logs 
WHERE action IN ('AUTO_STATUS_CHANGE', 'AUTO_OWNER_RESET')
GROUP BY DATE(timestamp), action
ORDER BY date DESC;
``` 