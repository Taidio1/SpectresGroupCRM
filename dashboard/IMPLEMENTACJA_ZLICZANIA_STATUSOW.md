# 📊 Implementacja Zliczania Statusów Canvas, AntyS, Sale dla Pracowników

## 🎯 Cel

System w sekcji "Statystyki pracowników z prowizją" na stronie "Raport - Szczegóły" zlicza statusy Canvas, AntyS, Sale dla każdego pracownika na podstawie przypisanych klientów (gdzie `owner_id = pracownik`).

## ✅ Co zostało zaimplementowane

### **1. Zmiana Logiki Zliczania**
- **Przed**: Zliczanie na podstawie `edited_by` (kto ostatnio edytował)
- **Po**: Zliczanie na podstawie `owner_id` (kto jest właścicielem klienta)

### **2. Rzeczywiste Dane w Tabeli**
- **Canvas**: Pokazuje liczbę klientów pracownika ze statusem "canvas"
- **AntyS**: Pokazuje liczbę klientów pracownika ze statusem "antysale"  
- **Sale**: Pokazuje liczbę klientów pracownika ze statusem "sale"
- **Prowizja EUR**: Obliczana na podstawie klientów Sale

### **3. Automatyczne Aktualizacje**
- Dane aktualizują się automatycznie przy zmianie statusów klientów
- Każdy pracownik widzi swoich przypisanych klientów

## 🛠️ Implementacja Techniczna

### **API - Nowa Logika** (`lib/supabase.ts`)
```typescript
// Pobierz WSZYSTKICH klientów przypisanych do pracowników
const { data: allOwnedClients } = await supabase
  .from('clients')
  .select('status, owner_id')
  .not('owner_id', 'is', null)

// Zlicz statusy per pracownik
const ownedClientsStats = allOwnedClients.reduce((acc, client) => {
  const ownerId = client.owner_id
  if (!acc[ownerId]) {
    acc[ownerId] = { canvas: 0, antysale: 0, sale: 0 }
  }
  
  switch (client.status) {
    case 'canvas': acc[ownerId].canvas++; break
    case 'antysale': acc[ownerId].antysale++; break  
    case 'sale': acc[ownerId].sale++; break
  }
  
  return acc
}, {})
```

### **Frontend - Wyświetlanie** (`components/reports.tsx`)
```typescript
{/* Canvas - rzeczywiste dane */}
<Badge className="bg-blue-500/20 text-blue-400">
  {employee.monthlyCanvas}
</Badge>

{/* AntyS - rzeczywiste dane */}
<Badge className="bg-orange-500/20 text-orange-400">
  {employee.monthlyAntysale}
</Badge>

{/* Sale - rzeczywiste dane */}
<Badge className="bg-green-500/20 text-green-400">
  {employee.monthlySale}
</Badge>

{/* Prowizja EUR */}
<div className="font-semibold text-green-400">
  €{employee.commissionEUR.toFixed(2)}
</div>
```

## 🎯 Jak używać

### **1. Dostęp do Statystyk**
- Idź do: **Raport - Szczegóły**
- Sekcja: **"Statystyki pracowników z prowizją"**
- Dostęp: Tylko Manager/Szef/Admin

### **2. Odczytywanie Danych**
```
┌─────────────────┬────────┬───────┬──────┬──────────────┐
│ Pracownik       │ Canvas │ AntyS │ Sale │ Prowizja EUR │
├─────────────────┼────────┼───────┼──────┼──────────────┤
│ Jan Kowalski    │   15   │   8   │  12  │    €42.00    │
│ Anna Nowak      │   10   │   5   │   7  │    €21.00    │
└─────────────────┴────────┴───────┴──────┴──────────────┘
```

### **3. Aktualizacja Danych**
- Automatyczna: Dane odświeżają się przy ładowaniu strony
- Manualna: Odśwież stronę lub użyj funkcji odświeżania

## 🔍 Debugging

### **Console Logi**
Otwórz F12 > Console i poszukaj:
```
📊 Statystyki przypisanych klientów: {user1: {canvas: 5, sale: 3}, ...}
👤 Pracownik Jan Kowalski: Canvas=5, AntyS=2, Sale=3
```

### **Sprawdzenie Danych**
```javascript
// W konsoli przeglądarki
console.log(employees) // Dane wszystkich pracowników
console.log(employeeStatsData) // Surowe dane z API
```

## 🧪 Testowanie

### **Test 1: Przypisanie Klienta**
1. Idź do tabeli klientów
2. Edytuj dowolnego klienta
3. Automatycznie stajesz się jego właścicielem (`owner_id`)

### **Test 2: Zmiana Statusu**
1. Zmień status klienta na "sale"
2. Idź do Raport - Szczegóły
3. Sprawdź czy licznik Sale się zwiększył

### **Test 3: Różni Pracownicy**
1. Zaloguj się jako Manager/Admin
2. Zobacz statystyki wszystkich pracowników
3. Sprawdź czy liczby się sumują

## 📊 Logika Biznesowa

### **Owner_id vs Edited_by**
- **`owner_id`**: Określa kto **POSIADA** klienta (używane do statusów)
- **`edited_by`**: Określa kto **OSTATNIO EDYTOWAŁ** (używane do aktywności)

### **Automatyczne Przypisywanie**
```typescript
// Każda osoba która edytuje klienta zostaje jego właścicielem
updatedData.owner_id = user.id
```

### **Obliczanie Prowizji**
```typescript
// Prowizja = liczba_klientów_sale * stopa_prowizji
const commission = (saleClients * commissionRate / 100) * 100
```

## 🚀 Status Wdrożenia

### ✅ **Gotowe**
- Zliczanie statusów na podstawie owner_id
- Wyświetlanie rzeczywistych danych w tabeli
- Automatyczne aktualizacje przy edycji klientów
- Logowanie i debugging
- Dokumentacja

### 🔮 **Możliwe Rozszerzenia**
- Filtrowanie czasowe (ostatni miesiąc/tydzień)
- Trendy zmian statusów
- Powiadomienia o niskiej konwersji
- Cele sprzedażowe dla pracowników

## 🛡️ Uwagi Techniczne

- **Wydajność**: Jedno zapytanie SQL na wszystkich klientów
- **Bezpieczeństwo**: Respektuje RLS (Row Level Security)
- **Kompatybilność**: Zachowuje dotychczasową funkcjonalność
- **Logging**: Szczegółowe logi do monitorowania
- **Build**: Aplikacja kompiluje się bez błędów

## 🎉 Podsumowanie

System teraz prawidłowo zlicza statusy Canvas, AntyS, Sale dla każdego pracownika na podstawie klientów, których są właścicielami. Dane są automatycznie aktualizowane i wyświetlane w czytelnej tabeli w sekcji raportów szczegółowych. 