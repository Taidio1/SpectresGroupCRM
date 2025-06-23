# 👑 Admin Panel - Przewodnik

## 📋 **Przegląd**

Admin Panel to zaawansowany interfejs administracyjny dostępny wyłącznie dla użytkowników z rolą **admin** i **szef**. Panel zapewnia pełną kontrolę nad systemem Spectres Group CRM.

## 🔐 **Dostęp**

### **Uprawnienia:**
- ✅ **admin** - pełny dostęp do wszystkich funkcji
- ✅ **szef** - pełny dostęp do wszystkich funkcji  
- ❌ **manager** - brak dostępu
- ❌ **project_manager** - brak dostępu
- ❌ **junior_manager** - brak dostępu
- ❌ **pracownik** - brak dostępu

### **Jak dostać się do Admin Panel:**
1. Zaloguj się jako użytkownik z rolą `admin` lub `szef`
2. W sidebars pojawi się opcja **"Admin Panel"** z ikoną tarczy
3. Kliknij link lub przejdź bezpośrednio na `/admin`

## 🎯 **Funkcjonalności**

### **1. Przegląd Systemu (Overview)**
- **Statystyki na żywo:**
  - 👥 Łączna liczba użytkowników
  - 🎯 Łączna liczba klientów w systemie
  - 📞 Statystyki kliknięć telefonu (łącznie i dzisiaj)
  - ⚡ Status systemu (online/offline)

- **Top Pracownicy:**
  - Ranking 5 najlepszych pracowników według liczby sprzedaży (sales)
  - Avatary, pozycje, liczba zdobytych klientów
  - Automatyczne sortowanie według wyników

- **Wykorzystanie Bazy Danych:**
  - Klienci z przypisanym właścicielem vs bez właściciela
  - Procent wykorzystania bazy danych
  - **[ADMIN ONLY]** Przycisk "Resetuj Właścicieli Klientów"

### **2. Zarządzanie Użytkownikami (Users)**
- **Tabela wszystkich użytkowników** z informacjami:
  - Avatar i pełne imię
  - Adres email
  - Rola z kolorowym badge
  - Status (aktywny/nieaktywny)
  
- **Akcje na użytkownikach:**
  - ✏️ **Edytuj użytkownika** - pełny formularz edycji
  - 🗑️ **Usuń użytkownika** (planowane)

#### **Dialog Edycji Użytkownika:**
- Pełne imię i nazwisko
- Adres email  
- Rola (wszystkie dostępne role w systemie)
- Numer telefonu
- Język interfejsu (Polski/English/Slovenčina)
- Bio/Opis użytkownika
- Informacje systemu (ID, daty utworzenia/aktualizacji)

### **3. Baza Danych (Database)**
- **Statystyki tabel:**
  - Liczba rekordów w `users`
  - Liczba rekordów w `clients`  
  - Liczba rekordów w `activity_logs`

- **Operacje konserwacyjne:**
  - 🔄 Odśwież Materialized Views
  - 📦 Archiwizuj Stare Logi
  - ⚡ Optymalizuj Bazę Danych

### **4. Wydajność (Performance)**
- **Pełny Performance Dashboard** z możliwością:
  - Monitorowania wydajności systemu
  - Sprawdzania świeżości materializowanych widoków
  - Analizy statystyk bazy danych
  - Manualnej optymalizacji systemu
  - Wyświetlania rekomendacji wydajności

### **5. Ustawienia (Settings)**
- **Konfiguracja systemu:**
  - Status automatycznego odświeżania
  - Powiadomienia email
  
- **Raporty i eksport:**
  - Eksport danych użytkowników
  - Generowanie raportów systemu

## 🛡️ **Bezpieczeństwo**

### **Sprawdzanie uprawnień:**
1. **Na poziomie strony** (`/admin/page.tsx`):
   - Sprawdzanie roli użytkownika
   - Automatyczne przekierowanie jeśli brak uprawnień

2. **Na poziomie komponentu** (`AdminPanel`):
   - Dodatkowa walidacja uprawnień
   - Wyświetlanie komunikatu o braku dostępu

3. **Funkcje specjalne:**
   - **Resetowanie właścicieli** - tylko dla `admin`
   - **Krytyczne operacje** - wymóg potwierdzenia

### **Komunikaty błędów:**
- Brak uprawnień → przekierowanie na główną stronę
- Błąd ładowania danych → toast z informacją o błędzie
- Problemy z API → graceful fallback z retry

## 🎨 **UI/UX**

### **Design System:**
- **Dark theme** zgodny z resztą aplikacji
- **Kolorystyka:**
  - 🔵 Cyan - główne akcje i linki
  - 🟡 Amber - ostrzeżenia i wyróżnienia
  - 🔴 Red - błędy i akcje destrukcyjne
  - 🟢 Green - sukces i pozytywne statusy

### **Responsywność:**
- Pełna responsywność na urządzeniach mobilnych
- Grid system dostosowujący się do rozmiaru ekranu
- Touch-friendly buttony i interakcje

### **Animacje:**
- Loading spinnery podczas ładowania danych
- Hover effects na przyciskach i kartach
- Smooth transitions między tabami

## 📊 **Statystyki w czasie rzeczywistym**

- **Auto-refresh** - dane odświeżane co 5 minut
- **Manual refresh** - przycisk odświeżania w headerze
- **Live indicators** - wskaźniki aktywności systemu
- **Progress bars** - wizualizacja wykorzystania zasobów

## 🔧 **Rozwój i maintenance**

### **Pliki projektu:**
```
app/admin/
├── page.tsx                      # Strona admin z autoryzacją
components/admin/
├── admin-panel.tsx               # Główny komponent admin panel
├── user-edit-dialog.tsx          # Dialog edycji użytkowników
└── performance-dashboard.tsx     # Dashboard wydajności
```

### **Dodawanie nowych funkcji:**
1. Dodaj nową zakładkę w `TabsList`
2. Stwórz odpowiedni `TabsContent`
3. Implementuj API calls w funkcjach load...
4. Dodaj obsługę błędów i loading states

### **Integracja z API:**
- Wszystkie operacje są asynchroniczne
- Proper error handling z toast notifications
- Loading states dla lepszego UX
- Retry mechanizmy dla niepowodzeń

## 🚀 **Uruchomienie**

Admin Panel jest automatycznie dostępny po:
1. ✅ Poprawnej kompilacji aplikacji
2. ✅ Zalogowaniu jako admin/szef
3. ✅ Dostępie do `/admin` lub kliknięciu linku w sidebar

**Panel jest gotowy do użytku!** 👑 