# HISTORIA ZMIAN - INSTRUKCJE TESTOWANIA

## 🎯 Co zostało dodane

### ✅ **Nowa funkcjonalność: Historia zmian klienta**
- **Lokalizacja:** Dialog edycji klienta (prawa kolumna)
- **Dostęp:** Wszyscy użytkownicy niezależnie od roli
- **Dane:** Edytor, data/godzina, aktualny status klienta

## 🚀 Jak przetestować

### **Krok 1: Otwórz dialog edycji**
1. Przejdź do sekcji "Klienci" 
2. Kliknij ikonę **Edytuj** (ołówek) przy dowolnym kliencie
3. Dialog powinien być teraz szerszy (3 kolumny zamiast 2)

### **Krok 2: Sprawdź historię**
W prawej kolumnie powinieneś zobaczyć:
- 📜 **Nagłówek "Historia zmian"** z ikoną
- 🔄 **Loader** podczas ładowania danych  
- 📋 **Lista zmian** (jeśli istnieją) lub komunikat "Brak historii"

### **Krok 3: Wykonaj zmiany testowe**
1. **Zmień status klienta** (np. z "canvas" na "sale")
2. **Zapisz zmiany**
3. **Otwórz dialog ponownie**
4. **Sprawdź** czy nowa zmiana pojawiła się w historii

### **Krok 4: Sprawdź różne role użytkowników**
- Zaloguj się jako **pracownik**, **manager**, **admin**
- Każdy powinien widzieć **pełną historię** niezależnie od roli

## 📋 Co powinieneś zobaczyć w historii

### **Każdy wpis zawiera:**
```
👤 [Nazwa użytkownika] [Rola - kolorowy badge]
📅 [DD.MM.YYYY] • [HH:MM]
📊 Status: [Nowy status z kolorowym badge]
🔄 [Typ operacji: Utworzono/Zaktualizowano/Usunięto]
```

### **Przykład wpisu:**
```
👤 Jan Kowalski [pracownik]
📅 15.06.2024 • 14:30
📊 Status: sale
🔄 Zaktualizowano
```

## 🎨 Elementy UI

### **Kolory ról (badges):**
- 🔴 **Admin:** czerwony  
- 🟣 **Szef:** fioletowy
- 🔵 **Manager:** niebieski
- 🟢 **Pracownik:** zielony

### **Kolory statusów (badges):**
- 🔵 **canvas:** niebieski
- ⚫ **brak_kontaktu:** szary  
- 🔴 **nie_zainteresowany:** czerwony
- 🟠 **antysale:** pomarańczowy
- 🟢 **sale:** zielony
- 🟡 **$$:** żółty

## 🔧 Funkcje techniczne

### **API endpoint:**
```typescript
activityLogsApi.getClientHistory(clientId)
```

### **Dane pobierane:**
- Historia ostatnich **20 zmian**
- **Join z tabelą users** dla nazwy edytora
- **Sortowanie** od najnowszych do najstarszych

### **Performance:**
- ⚡ **Lazy loading** - historia ładuje się dopiero po otwarciu dialogu
- 🗑️ **Cleanup** - historia czyści się po zamknięciu dialogu
- 📜 **Scroll area** - przewijanie dla długiej listy

## 🐛 Rozwiązywanie problemów

### **Problem: "Brak historii zmian"**
**Możliwe przyczyny:**
1. Klient nie miał jeszcze żadnych zmian
2. Tabela `activity_logs` jest pusta
3. Foreign key nie działa poprawnie

**Rozwiązanie:**
```sql
-- Sprawdź czy są jakieś logi w bazie
SELECT COUNT(*) FROM activity_logs;

-- Sprawdź logi dla konkretnego klienta  
SELECT * FROM activity_logs WHERE client_id = 'CLIENT_ID_HERE';
```

### **Problem: "Ładowanie..." bez końca**
**Możliwe przyczyny:**
1. Błąd w query SQL (foreign key)
2. Problemy z uprawnieniami RLS

**Rozwiązanie:**
```sql
-- Sprawdź czy RLS pozwala na odczyt
SELECT * FROM activity_logs LIMIT 1;
```

### **Problem: "Nieznany użytkownik"**
**Przyczyna:** Brak join z tabelą users lub user został usunięty

**Rozwiązanie:**
```sql
-- Sprawdź czy changed_by wskazuje na istniejącego usera
SELECT al.*, u.full_name 
FROM activity_logs al 
LEFT JOIN users u ON al.changed_by = u.id;
```

## 📊 Testowanie automatyczne logowania

### **Zmień różne pola i sprawdź czy logują się:**
1. ✅ **Status** - najważniejsze
2. ✅ **Telefon** 
3. ✅ **Email**
4. ✅ **Notatki**

### **Sprawdź czy trigger działa:**
```sql
-- Po każdej zmianie w clients, powinien się pojawić nowy wpis
SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 5;
```

## 🎉 Sukces!

Jeśli widzisz:
- ✅ Dialog z 3 kolumnami
- ✅ Historię zmian w prawej kolumnie  
- ✅ Kolorowe badges dla ról i statusów
- ✅ Prawidłowe daty i godziny
- ✅ Przewijanie listy historii

**Historia zmian działa poprawnie!** 🎯

---
**Wersja:** 1.0.0  
**Data aktualizacji:** 2024-06-XX 