# Przewodnik po Systemie Języków

## 🌐 Wielojęzyczność Aplikacji CRM

System obsługuje trzy języki:
- **🇵🇱 Polski** (domyślny)
- **🇬🇧 English** 
- **🇸🇰 Slovenčina**

## 🎯 Funkcjonalności

### ✅ Zmiana Języka w Ustawieniach
- Przejdź do **Ustawienia** → **Ustawienia językowe**
- Wybierz preferowany język z dropdown
- Język zostanie **natychmiastowo zapisany** w bazie danych
- Aplikacja automatycznie odświeży interface

### ✅ Trwałe Preferencje
- Język jest zapisywany w profilu użytkownika
- Po ponownym logowaniu język pozostaje ten sam
- Każdy użytkownik ma własne ustawienia językowe

### ✅ Wskaźnik Języka
- Aktualny język jest widoczny w interface
- Badge pokazuje flagę i nazwę języka
- Dostępny w różnych komponentach

## 🔧 Implementacja Techniczna

### 1. Struktura Bazy Danych
```sql
-- Kolumna w tabeli users
ALTER TABLE users 
ADD COLUMN language VARCHAR(2) DEFAULT 'pl' 
CHECK (language IN ('pl', 'en', 'sk'));
```

### 2. Interfejs TypeScript
```typescript
export interface User {
  // ... inne pola
  language?: 'pl' | 'en' | 'sk'
}
```

### 3. System Tłumaczeń
```typescript
// lib/translations.ts
export const translations = {
  pl: { language: 'Język', save: 'Zapisz', ... },
  en: { language: 'Language', save: 'Save', ... },
  sk: { language: 'Jazyk', save: 'Uložiť', ... }
}
```

### 4. Hook Tłumaczeń
```typescript
const { t } = useTranslation(user.language)
// Użycie: t('save') → 'Zapisz' / 'Save' / 'Uložiť'
```

## 📁 Struktury Plików

### Nowe Pliki
- `lib/translations.ts` - Definicje tłumaczeń
- `components/language-indicator.tsx` - Wskaźnik języka
- `add_language_column.sql` - Migracja bazy danych
- `language_system_guide.md` - Ta dokumentacja

### Zmodyfikowane Pliki
- `lib/supabase.ts` - Zaktualizowany interfejs User
- `components/settings/user-settings-form.tsx` - Sekcja języka

## 🎨 Komponenty UI

### 1. Selector Języka (Ustawienia)
```jsx
<Select value={language} onValueChange={handleLanguageChange}>
  <SelectTrigger>
    <SelectValue placeholder="Wybierz język" />
  </SelectTrigger>
  <SelectContent>
    {Object.entries(AVAILABLE_LANGUAGES).map(([code, lang]) => (
      <SelectItem key={code} value={code}>
        {lang.flag} {lang.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 2. Wskaźnik Języka
```jsx
<LanguageIndicator user={user} />
// Wyświetla: 🇵🇱 Polski
```

## 🔄 Workflow Użytkownika

### Zmiana Języka
1. **Krok 1**: Użytkownik idzie do Ustawień
2. **Krok 2**: Klika na dropdown "Wybierz język aplikacji"
3. **Krok 3**: Wybiera preferowany język
4. **Krok 4**: System automatycznie:
   - Zapisuje w bazie danych
   - Pokazuje toast z potwierdzeniem
   - Odświeża interface (przyszła funkcjonalność)

### Logowanie
1. System sprawdza preferowany język użytkownika
2. Ładuje odpowiednie tłumaczenia
3. Wyświetla interface w wybranym języku

## 🔮 Przyszłe Rozszerzenia

### Planowane Funkcjonalności
- **Automatyczne tłumaczenie** całego interfejsu
- **Detekcja języka przeglądarki** dla nowych użytkowników
- **Dodatkowe języki** (niemiecki, francuski, etc.)
- **Tłumaczenie statusów klientów** i innych danych

### Dodanie Nowego Języka
1. Rozszerz typ `Language` w `lib/translations.ts`
2. Dodaj wpis do `AVAILABLE_LANGUAGES`
3. Stwórz sekcję tłumaczeń
4. Zaktualizuj check constraint w bazie danych
5. Przetestuj wszystkie komponenty

## 🎯 API Funkcje

### Zmiana Języka
```typescript
await authApi.updateUserLanguage(userId, 'en')
```

### Pobieranie Tłumaczeń
```typescript
const { t, language, availableLanguages } = useTranslation('sk')
```

## 🧪 Testowanie

### 1. Test Zmiany Języka
```bash
# 1. Zaloguj się jako różni użytkownicy
# 2. Zmień język w ustawieniach
# 3. Sprawdź czy zapisuje się w bazie
# 4. Wyloguj i zaloguj ponownie
# 5. Sprawdź czy język się utrzymuje
```

### 2. Test Funkcjonalności
- ✅ Dropdown wyświetla wszystkie języki
- ✅ Wybór języka zapisuje natychmiastowo
- ✅ Toast pokazuje potwierdzenie
- ✅ Błędy są obsługiwane gracefully
- ✅ Wskaźnik języka aktualizuje się

## 🛡️ Obsługa Błędów

### Scenariusze Błędów
1. **Brak połączenia z bazą** → Powrót do poprzedniego języka
2. **Nieprawidłowy kod języka** → Fallback do 'pl'
3. **Błąd zapisu** → Toast z informacją o błędzie

### Zabezpieczenia
- Walidacja kodu języka przed zapisem
- Graceful fallback do domyślnego języka
- Rollback przy błędach

## 📊 Statystyki Języków

### Zapytanie SQL - Rozkład Języków
```sql
SELECT 
  language,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM users 
WHERE language IS NOT NULL
GROUP BY language
ORDER BY user_count DESC;
```

---

## 🎉 Podsumowanie

System języków został w pełni zaimplementowany i jest gotowy do użytku. Każdy użytkownik może:

- ✅ **Wybrać preferowany język** w ustawieniach
- ✅ **Automatycznie zapisać** preferencje 
- ✅ **Zachować ustawienia** między sesjami
- ✅ **Widzieć aktualny język** w interface

Kolejnym krokiem będzie rozszerzenie tłumaczeń na całą aplikację.

---

*Ostatnia aktualizacja: Grudzień 2024*  
*Wersja: 1.0 - Podstawowa implementacja* 