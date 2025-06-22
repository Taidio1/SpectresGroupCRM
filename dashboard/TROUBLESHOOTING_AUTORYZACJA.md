# 🔐 Rozwiązywanie Problemów z Autoryzacją

## 🚨 Częste Problemy i Rozwiązania

### Problem: Aplikacja zatrzymuje się na ekranie ładowania

**Objawy:**
- Po odświeżeniu strony aplikacja pokazuje tylko "Ładowanie..."
- Kolejne odświeżenia nie pomagają
- Jedynym rozwiązaniem jest wyczyszczenie ciasteczek

**Rozwiązania:**

#### 1. **Automatyczne wykrywanie (Nowa funkcja)**
- Aplikacja teraz automatycznie wykrywa zawieszenie sesji po 15 sekundach
- Automatycznie resetuje sesję i przekierowuje do logowania
- Pojawi się komunikat: "Wykryto zawieszenie sesji"

#### 2. **Ręczne rozwiązanie problemu**
```
1. Naciśnij F12 aby otworzyć narzędzia deweloperskie
2. Przejdź do zakładki "Application" / "Aplikacja"
3. W sekcji "Storage" znajdź "Local Storage" i "Session Storage"
4. Usuń wszystkie dane z obu sekcji
5. Przejdź do zakładki "Cookies" i usuń wszystkie ciasteczka
6. Odśwież stronę (F5)
```

#### 3. **Szybkie rozwiązanie (Chrome/Edge)**
```
1. Naciśnij Ctrl + Shift + Delete
2. Wybierz "Wszystkie dane"
3. Zaznacz: Ciasteczka, Dane aplikacji, Obrazy cached
4. Kliknij "Wyczyść dane"
5. Odśwież stronę
```

### Problem: Błędy autoryzacji po zmianie hasła

**Objawy:**
- Nie można się zalogować mimo poprawnych danych
- Komunikat o błędnej autoryzacji

**Rozwiązanie:**
1. Wyczyść wszystkie dane przeglądarki (jak wyżej)
2. Zamknij wszystkie karty z aplikacją
3. Otwórz nową kartę i przejdź do strony logowania
4. Zaloguj się ponownie

### Problem: Sesja "wygasa" zbyt szybko

**Objawy:**
- Częste wylogowania
- Konieczność częstego logowania

**Możliwe przyczyny:**
- Problemy z połączeniem internetowym
- Conflict z innymi aplikacjami
- Expired tokens

**Rozwiązanie:**
1. Sprawdź stabilność połączenia internetowego
2. Wyloguj się i zaloguj ponownie
3. Zamknij inne karty z aplikacjami Supabase

## 🔧 Zaawansowane Debugowanie (dla IT/Administratorów)

### Panel Debug Autoryzacji
- Dostęp: `/auth-debug` (tylko dla administratorów)
- Zawiera szczegółowe logi błędów
- Informacje o sesji i localStorage
- Możliwość eksportu logów

### Analiza Logów w Konsoli
1. Otwórz narzędzia deweloperskie (F12)
2. Przejdź do zakładki "Console"
3. Poszukaj komunikatów zaczynających się od:
   - `🔐 Auth Error:`
   - `❌ Błąd`
   - `⚠️ Warning`

### Typowe Błędy w Konsoli

#### `Authentication timeout`
- **Przyczyna**: Przekroczono limit czasu łączenia z serwerem (30s)
- **Rozwiązanie**: 
  - Sprawdź połączenie internetowe
  - Poczekaj chwilę i kliknij "Spróbuj ponownie"
  - Restart przeglądarki może pomóc
  - Wyczyść cache przeglądarki (Ctrl+Shift+Delete)

#### `Session hang detected`
- **Przyczyna**: Sesja się zawiesiła
- **Rozwiązanie**: Aplikacja automatycznie resetuje sesję

#### `RLS Error` / `PGRST116`
- **Przyczyna**: Problem z uprawnieniami bazy danych
- **Rozwiązanie**: Skontaktuj się z administratorem systemu

## 📞 Wsparcie Techniczne

### Dla Użytkowników
1. **Spróbuj kroków z sekcji "Częste Problemy"**
2. Jeśli problem nadal występuje, skontaktuj się z administratorem
3. Podaj dokładny opis problemu i kroki które prowadziły do błędu

### Dla Administratorów
1. **Sprawdź panel `/auth-debug`**
2. **Eksportuj logi błędów**
3. **Sprawdź status Supabase**: https://status.supabase.com/
4. **Sprawdź konfigurację RLS w bazie danych**

### Informacje do Podania przy Zgłoszeniu
- Przeglądarka i wersja (np. Chrome 120.0)
- System operacyjny
- Dokładny czas wystąpienia problemu
- Kroki które prowadziły do błędu
- Screenshot błędu (jeśli widoczny)
- Logi z konsoli (jeśli dostępne)

## 🛠️ Zapobieganie Problemom

### Dobre Praktyki dla Użytkowników
1. **Nie używaj wielu kart** z tą samą aplikacją jednocześnie
2. **Regularnie aktualizuj przeglądarkę**
3. **Nie wyłączaj JavaScript** w przeglądarce
4. **Wyloguj się** przed zamknięciem przeglądarki (opcjonalnie)

### Dobre Praktyki dla Administratorów
1. **Monitoruj logi błędów** w panelu debug
2. **Sprawdzaj status Supabase** przy problemach
3. **Utrzymuj aktualne tokeny API**
4. **Regularnie sprawdzaj konfigurację RLS**

## 🆕 Nowe Funkcje Bezpieczeństwa

### Automatyczne Wykrywanie Problemów
- ✅ **Timeout Detection**: Automatyczne wykrywanie przekroczenia limitu czasu
- ✅ **Session Hang Detection**: Wykrywanie zawieszenia sesji
- ✅ **Automatic Recovery**: Automatyczny reset przy problemach
- ✅ **Retry Logic**: Ponowne próby z exponential backoff
- ✅ **Error Logging**: Szczegółowe logowanie błędów

### Improved User Experience
- ✅ **Loading Indicators**: Lepsze wskaźniki ładowania
- ✅ **Error Messages**: Bardziej opisowe komunikaty błędów
- ✅ **Recovery Options**: Opcje odzyskiwania po błędach
- ✅ **Debug Information**: Informacje debugowe dla IT
- ✅ **Timeout Handling**: Zwiększone limity czasu (30s) dla wolnych połączeń
- ✅ **Connection Diagnostics**: Automatyczne wykrywanie problemów z siecią
- ✅ **AbortController**: Anulowanie zawieszonych operacji
- ✅ **User Guidance**: Instrukcje co robić w przypadku błędów

## 🆕 Najnowsze Poprawki (Aktualizacja Timeout)

### Rozwiązane Problemy z Timeout:
- ✅ **Zwiększony timeout** z 10s na 30s dla wolnych połączeń
- ✅ **AbortController** - anulowanie zawieszonych operacji
- ✅ **Lepsze komunikaty błędów** - specyficzne dla typu problemu
- ✅ **Diagnostyka połączenia** - automatyczne wykrywanie problemów sieci
- ✅ **User-friendly UI** - instrukcje co robić przy błędach

### Nowe Funkcje Error UI:
- 🔧 **Retry counter** - pokazuje ile prób pozostało
- 📋 **Instrukcje pomocy** - konkretne kroki dla użytkownika  
- ⏱️ **Informacje o timeout** - wyświetla aktualny limit czasu
- 🌐 **Diagnostyka sieci** - rozpoznaje problemy z połączeniem

### Dla Deweloperów:
```typescript
// Nowe timeouty:
AUTH_TIMEOUT_MS = 30000 // 30 sekund (zwiększone z 10s)
LOADING_HANG_TIMEOUT_MS = 45000 // 45 sekund (zwiększone z 15s)

// Nowe funkcje:
- AbortController dla anulowania operacji
- Lepsze error handling dla problemów sieciowych
- Diagnostyczne komunikaty błędów
- Retry mechanism z user feedback
```

---

**Aktualizacja**: Ten dokument został stworzony wraz z implementacją ulepszonego systemu autoryzacji (EnhancedAuthProvider) który rozwiązuje większość opisanych problemów automatycznie. Najnowsza aktualizacja rozwiązuje problemy z timeoutami dla wolnych połączeń. 