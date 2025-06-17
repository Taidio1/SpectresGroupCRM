# CRM Call Center

Rozbudowany system CRM dla call center zbudowany w oparciu o Next.js, Supabase, TailwindCSS i shadcn/ui.

## 🚀 Funkcjonalności

### ✅ Zaimplementowane
- **Dashboard** - Plan dnia z kalendarzem i slotami godzinowymi (8:00-10:00 canvas, 10:10-12:00 sales, 12:30-15:00 antysales, 15:10-16:30 canvas+sales)
- **Tabela klientów** - Live edycja, statusy, historia zmian
- **Raporty** - Podsumowania dzienne/tygodniowe, wykresy, eksport PDF/CSV
- **Responsywny design** - Ciemny motyw z efektami glass
- **Nawigacja** - Sidebar z przejściami między stronami

### 🔧 Architektura techniczna
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS, shadcn/ui
- **Stan**: Zustand
- **API**: TanStack Query + Supabase
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Wykresy**: Recharts

## 📋 Wymagania

- Node.js 18+
- Konto Supabase
- npm lub yarn

## 🛠️ Instalacja

1. **Sklonuj repozytorium**
```bash
git clone <repository-url>
cd dashboard
```

2. **Zainstaluj zależności**
```bash
npm install --legacy-peer-deps
```

3. **Konfiguracja Supabase**

   a) Utwórz nowy projekt w [Supabase Dashboard](https://supabase.com/dashboard)
   
   b) Skopiuj URL projektu i klucz anon z Settings > API
   
   c) Utwórz plik `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj_anon_key
   ```

4. **Konfiguracja bazy danych**

   Wykonaj SQL z pliku `supabase/schema.sql` w Supabase SQL Editor:
   - Tworzy tabele: `users`, `clients`, `activity_logs`
   - Konfiguruje Row Level Security (RLS)
   - Dodaje triggery i funkcje
   - Wstawia przykładowe dane

5. **Uruchom aplikację**
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

## 📊 Struktura bazy danych

### Tabele

#### `clients`
- `id` (UUID) - Klucz główny
- `first_name`, `last_name` - Imię i nazwisko
- `company_name`, `nip` - Dane firmy
- `phone`, `email` - Kontakt
- `notes`, `website` - Dodatkowe informacje
- `status` - Status klienta (enum)
- `edited_by`, `edited_at` - Informacje o edycji

#### `users`
- `id` (UUID) - Powiązane z auth.users
- `email`, `full_name` - Dane użytkownika
- `role` - Rola (admin, szef, manager, pracownik)

#### `activity_logs`
- `id` (UUID) - Klucz główny
- `client_id` - Powiązanie z klientem
- `changed_by` - Kto dokonał zmiany
- `change_type` - Typ zmiany (create, update, delete)
- `field_changed` - Które pole zostało zmienione
- `old_value`, `new_value` - Stare i nowe wartości

### Statusy klientów
- `canvas` - Pierwszy kontakt
- `brak_kontaktu` - Nie można się dodzwonić
- `nie_zainteresowany` - Klient nie jest zainteresowany
- `zdenerwowany` - Klient zdenerwowany
- `antysale` - Wymaga dodatkowych negocjacji
- `sale` - Sprzedaż zakończona sukcesem
- `$$` - Klient VIP

### Role użytkowników
- `admin` - Pełny dostęp do wszystkich funkcji
- `szef` - Dostęp do raportów i przeglądu
- `manager` - Zarządzanie klientami i zespołem
- `pracownik` - Podstawowe operacje na klientach

## 🔐 Bezpieczeństwo

Aplikacja wykorzystuje Row Level Security (RLS) Supabase:
- **Admin/Szef**: Pełny dostęp do wszystkich danych
- **Manager**: Zarządzanie klientami i raportami
- **Pracownik**: Ograniczony dostęp do edycji klientów

## 🎯 Plan dnia (domyślny rozkład)

- **8:00 - 10:00**: Canvas (pierwsze kontakty)
- **10:10 - 12:00**: Sales (sprzedaż)
- **12:30 - 15:00**: Antysales (negocjacje)
- **15:10 - 16:30**: Canvas + Sales (mieszane)

## 📱 Funkcjonalności

### Dashboard
- Kalendarz dzienny z przypisanymi klientami
- Statystyki statusów (wykres kołowy)
- Metryki dzienne (klienci, rozmowy, konwersja)
- Aktywność pracowników (wykres liniowy)
- Feed ostatnich aktywności

### Tabela klientów
- Live edycja z oznaczeniem aktywnych sesji
- Inline editing wszystkich pól
- Zarządzanie statusami
- Historia zmian z timestampami
- Filtrowanie i wyszukiwanie

### Raporty
- Podsumowania dzienne/tygodniowe/miesięczne
- Wykresy aktywności pracowników
- Statystyki konwersji
- Eksport do PDF/CSV
- Filtrowanie po dacie, pracowniku, statusie

## 🚀 Deployment

### Vercel (zalecane)
1. Połącz repozytorium z Vercel
2. Dodaj zmienne środowiskowe w Vercel Dashboard
3. Deploy automatycznie

### Inne platformy
Aplikacja jest kompatybilna z każdą platformą obsługującą Next.js.

## 🔧 Rozwój

### Dodawanie nowych funkcji
1. Komponenty UI w `components/`
2. Strony w `app/`
3. API w `lib/supabase.ts`
4. Stan w `store/useStore.ts`

### Struktura projektu
```
dashboard/
├── app/                 # Next.js App Router
├── components/          # Komponenty React
├── lib/                 # Konfiguracja (Supabase)
├── store/               # Zustand store
├── supabase/            # Schemat bazy danych
└── public/              # Pliki statyczne
```

## 📞 Wsparcie

W przypadku problemów:
1. Sprawdź logi w konsoli przeglądarki
2. Zweryfikuj konfigurację Supabase
3. Upewnij się, że baza danych jest poprawnie skonfigurowana

## 📄 Licencja

MIT License - możesz swobodnie używać i modyfikować kod. 