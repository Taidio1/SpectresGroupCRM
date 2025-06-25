# 📡 System Powiadomień - Dokumentacja

## 🎯 Przegląd systemu

System powiadomień automatycznie generuje i zarządza powiadomieniami dla użytkowników na podstawie:
- **Przypomnień o klientach** - gdy nadejdzie ustawiona data/godzina
- **Ostrzeżeń antysale** - klienci ze statusem antysale dłużej niż 5 dni
- **Powiadomień systemowych** - ręcznie dodawane przez administratorów

## 🗂️ Struktura systemu

### Baza danych
```sql
-- Tabela notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('reminder', 'antysale_warning', 'system', 'manual')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  urgent boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NULL
);
```

### Komponenty Frontend
- **`NotificationBell`** - dzwonek powiadomień w navbar'ze
- **`TodayReminders`** - widget dzisiejszych przypomnień na dashboard'zie
- **`useNotifications`** - hook do zarządzania powiadomieniami
- **`useTodayReminders`** - hook do dzisiejszych przypomnień

### Backend API
- **`notificationsApi`** - API do operacji CRUD na powiadomieniach
- **`/api/cron/notifications-check`** - endpoint cron job'a

## 🔧 Konfiguracja

### 1. Uruchomienie w bazie danych

```bash
# Uruchom skrypt SQL w Supabase
psql -h your-db-host -U postgres -d your-db-name -f sql/create_notifications_system.sql
```

### 2. Konfiguracja Cron Jobs w Supabase (opcjonalnie)

```sql
-- W Supabase SQL Editor:

-- Włącz rozszerzenie pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Przypomnienia co minutę
SELECT cron.schedule('reminder-notifications', '* * * * *', 'SELECT create_reminder_notifications();');

-- Ostrzeżenia antysale codziennie o 9:00
SELECT cron.schedule('antysale-warnings', '0 9 * * *', 'SELECT create_antysale_warnings();');

-- Czyszczenie starych powiadomień co tydzień w niedzielę o 2:00
SELECT cron.schedule('cleanup-notifications', '0 2 * * 0', 'SELECT cleanup_old_notifications();');
```

### 3. Zmienne środowiskowe

```bash
# .env.local
CRON_SECRET_TOKEN=your-secret-token-for-cron-jobs
```

### 4. Vercel Cron (domyślnie skonfigurowane)

Plik `vercel.json` zawiera:
```json
{
  "crons": [
    {
      "path": "/api/cron/notifications-check",
      "schedule": "* * * * *"
    }
  ]
}
```

## 🎨 Integracja z komponentami

### Dodanie dzwonka powiadomień do navbar'a

```tsx
// components/header.tsx
import { NotificationBell } from "@/components/notification-bell"

export function Header() {
  return (
    <div className="header">
      {/* ... inne elementy ... */}
      <NotificationBell enableRealtime={true} maxNotifications={10} />
      {/* ... */}
    </div>
  )
}
```

### Dodanie przypomnień na dashboard

```tsx
// app/page.tsx lub components/dashboard.tsx
import { TodayReminders } from "@/components/today-reminders"

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <TodayReminders />
      {/* ... inne komponenty dashboard'a ... */}
    </div>
  )
}
```

### Użycie hook'ów w komponentach

```tsx
// Przykład komponentu z powiadomieniami
import { useNotifications } from "@/hooks/use-notifications"

export function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading
  } = useNotifications({
    unreadOnly: false,
    limit: 20,
    enableRealtime: true
  })

  return (
    <div>
      <h3>Powiadomienia ({unreadCount})</h3>
      {notifications.map(notification => (
        <div key={notification.id} onClick={() => markAsRead(notification.id)}>
          {notification.title}
        </div>
      ))}
    </div>
  )
}
```

## ⚙️ Funkcje SQL

### Główne funkcje automatyzacji

- **`create_reminder_notifications()`** - sprawdza przypomnienia i tworzy powiadomienia
- **`create_antysale_warnings()`** - sprawdza długotrwałe statusy antysale
- **`cleanup_old_notifications()`** - czyści stare powiadomienia

### Funkcje pomocnicze

- **`mark_notification_as_read(notification_id)`** - oznacza powiadomienie jako przeczytane
- **`mark_all_notifications_as_read()`** - oznacza wszystkie powiadomienia użytkownika jako przeczytane

## 🔒 System uprawnień (RLS)

Powiadomienia są zabezpieczone Row Level Security:

- **Pracownicy** - widzą tylko swoje powiadomienia
- **Project Managerowie** - widzą powiadomienia z ich lokalizacji
- **Managerowie/Admin/Szef** - widzą wszystkie powiadomienia

## 📊 Typy powiadomień

### 1. Reminder (przypomnienia)
```javascript
{
  type: 'reminder',
  title: '📌 Przypomnienie o kliencie',
  message: 'Przypomnienie o kliencie Jan Kowalski (ABC Sp. z o.o.) na 14:00. Notatka: Spotkanie w sprawie oferty',
  urgent: true,
  metadata: {
    reminder_time: '14:00',
    reminder_note: 'Spotkanie w sprawie oferty'
  }
}
```

### 2. Antysale Warning (ostrzeżenia)
```javascript
{
  type: 'antysale_warning',
  title: '⚠️ Długotrwały status antysale',
  message: 'Klient XYZ Corp jest w statusie antysale już 7 dni (od 2024-01-15). Wymaga interwencji.',
  urgent: true,
  metadata: {
    days_in_antysale: 7,
    status_changed_at: '2024-01-15T10:00:00Z'
  }
}
```

### 3. System (systemowe)
```javascript
{
  type: 'system',
  title: 'Aktualizacja systemu',
  message: 'System zostanie zaktualizowany dziś o 23:00. Czas niedostępności: ~10 minut.',
  urgent: false,
  metadata: {
    maintenance_start: '2024-01-22T23:00:00Z',
    estimated_duration: '10 minutes'
  }
}
```

## 🧪 Testowanie

### Manualne uruchomienie cron job'a

```bash
# Uruchom sprawdzanie powiadomień
curl -X POST http://localhost:3000/api/cron/notifications-check \
  -H "Authorization: Bearer your-secret-token"
```

### Testowanie w React Query DevTools

Hook `useNotifications` jest w pełni zintegrowany z React Query, więc można monitorować i debugować zapytania w DevTools.

### Testowanie real-time

Real-time powiadomienia używają Supabase Realtime. Aby przetestować:

1. Otwórz aplikację w dwóch kartach
2. W jednej karcie dodaj powiadomienie przez SQL:
```sql
INSERT INTO public.notifications (user_id, type, title, message, urgent)
VALUES ('user-id', 'manual', 'Test', 'Test message', true);
```
3. Powiadomienie powinno pojawić się w drugiej karcie automatycznie

## 🔧 Rozwiązywanie problemów

### Problem: Powiadomienia się nie generują

1. Sprawdź czy funkcje SQL działają:
```sql
SELECT create_reminder_notifications();
SELECT create_antysale_warnings();
```

2. Sprawdź logi cron job'a:
```bash
# Sprawdź logi Vercel w dashboard
```

3. Sprawdź czy klienci mają poprawnie ustawione przypomnienia:
```sql
SELECT * FROM clients WHERE reminder IS NOT NULL AND (reminder->>'enabled')::boolean = true;
```

### Problem: Real-time nie działa

1. Sprawdź połączenie Supabase Realtime
2. Sprawdź czy RLS policies pozwalają na dostęp
3. Sprawdź konsole browser'a na błędy WebSocket

### Problem: Powiadomienia nie są widoczne

1. Sprawdź RLS policies
2. Sprawdź czy użytkownik ma odpowiednie uprawnienia
3. Sprawdź filtry w hook'ach

## 📈 Monitoring i metryki

Zalecane metryki do monitorowania:

- Liczba powiadomień generowanych dziennie
- Średni czas do przeczytania powiadomienia
- Procent powiadomień oznaczonych jako przeczytane
- Błędy w cron job'ach
- Wydajność zapytań do tabeli notifications

## 🚀 Przyszłe ulepszenia

- [ ] Powiadomienia email/SMS dla pilnych przypadków
- [ ] Grupowanie podobnych powiadomień
- [ ] Personalizowane ustawienia powiadomień dla użytkowników
- [ ] Dashboard analytics dla powiadomień
- [ ] Integracja z zewnętrznymi systemami (Slack, Teams)
- [ ] Powiadomienia push w przeglądarce (Web Push API)

## 📞 Wsparcie

W przypadku problemów:
1. Sprawdź logi aplikacji w komponencie `logger`
2. Sprawdź logi Supabase w dashboard
3. Sprawdź Vercel Function logs
4. Sprawdź React Query DevTools dla hook'ów 