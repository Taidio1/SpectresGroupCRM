# 📱 Przewodnik: Popup z Detalami Klienta

## 🎯 **Funkcjonalność**

Po kliknięciu w **numer telefonu** w kolumnie "Kontakt" otwiera się elegancki popup z pełnymi detalami klienta.

## 🔧 **Jak To Działa**

### **1. Wyzwalacz**
```typescript
// Kliknięcie w telefon w tabeli
<button onClick={() => handlePhoneClick(client)}>
  {client.phone}
</button>
```

### **2. Stan Popup**
```typescript
const [selectedClientForDetails, setSelectedClientForDetails] = useState(null)
const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false)

const handlePhoneClick = (client) => {
  setSelectedClientForDetails(client)
  setIsDetailsPopupOpen(true)
}
```

### **3. Komponent Popup**
```typescript
<ClientDetailsPopup
  isOpen={isDetailsPopupOpen}
  onClose={handleCloseDetailsPopup}
  client={selectedClientForDetails}
/>
```

## 📋 **Zawartość Popup**

### **Nagłówek**
- ✅ **Avatar klienta** (inicjały lub zdjęcie właściciela)
- ✅ **Imię i Nazwisko** - duży font
- ✅ **Nazwa firmy** - pod imieniem
- ✅ **Przycisk zamknij** (X)

### **Status i Data**
- ✅ **Badge statusu** - z kolorami (Canvas, Sprzedaż, etc.)
- ✅ **Data ostatniej edycji** - sformatowana z ikoną kalendarza

### **Informacje Kontaktowe**
```
📞 Telefon: +48 123 456 789 (klikalny - dzwoni)
📧 Email: email@firma.pl (klikalny - otwiera maila)
🏢 Firma: Nazwa Firmy Sp. z o.o.
📄 NIP: 1234567890
🌐 Strona WWW: www.firma.pl (klikalny link)
```

### **Właściciel Klienta**
- ✅ **Avatar właściciela** - zdjęcie lub inicjały
- ✅ **Pełne imię** właściciela
- ✅ **Email właściciela**
- ✅ **Sekcja** tylko gdy klient ma właściciela

### **Notatka**
- ✅ **Pełna notatka** w osobnej sekcji
- ✅ **Formatowanie** zachowane (whitespace-pre-wrap)
- ✅ **Sekcja** tylko gdy notatka istnieje

### **Daty**
```
┌─────────────────┬─────────────────┐
│ Utworzono       │ Ostatnia edycja │
│ 15.12.2024      │ 20.12.2024      │
│ o 14:30         │ o 16:45         │
└─────────────────┴─────────────────┘
```

### **Akcje**
- 🟢 **Zadzwoń** - otwiera aplikację telefonu
- 📧 **Email** - otwiera klienta poczty
- ⚪ **Zamknij** - zamyka popup

## 🎨 **Stylowanie**

### **Kolory Statusów**
```typescript
const statusColors = {
  'canvas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'sale': 'bg-green-500/20 text-green-400 border-green-500/30',
  'brak_kontaktu': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  // itd...
}
```

### **Responsywność**
- ✅ **Desktop**: 2 kolumny informacji kontaktowych
- ✅ **Mobile**: 1 kolumna
- ✅ **Max width**: 2xl (896px)
- ✅ **Dark theme** - slate/gray paleta

## 🌐 **Obsługa Języków**

### **Tłumaczenia**
```typescript
const { t } = useLanguage()

// Statusy przetłumaczone
{t(`clients.statuses.${client.status}`) || client.status}

// Gotowe do rozszerzenia o inne teksty
```

### **Formatowanie Dat**
```typescript
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString('pl-PL'),
    time: date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  }
}
```

## 🔗 **Interakcje**

### **Klikalny Telefon**
```typescript
const handlePhoneClick = (phone: string) => {
  window.open(`tel:${phone}`, '_self')
}
// Otwiera natywną aplikację telefonu
```

### **Klikalny Email**
```typescript
const handleEmailClick = (email: string) => {
  window.open(`mailto:${email}`, '_self')
}
// Otwiera domyślnego klienta email
```

### **Klikalny Website**
```typescript
href={client.website.startsWith('http') 
  ? client.website 
  : `https://${client.website}`}
target="_blank"
// Automatycznie dodaje https:// jeśli brak
```

## 🎯 **UX/UI Szczegóły**

### **Hover Efekty**
- ✅ Telefon w tabeli: **cyan** hover z underline
- ✅ Przyciski w popup: **smooth transitions**
- ✅ Linki: **hover states** dla lepszej interakcji

### **Loading States**
- ✅ Brak loading - **natychmiastowe** otwieranie
- ✅ Dane już dostępne z tabeli

### **Accessibility**
- ✅ **Escape** zamyka popup
- ✅ **Click outside** zamyka popup
- ✅ **Focus management** w dialog
- ✅ **ARIA labels** dla screen readers

## 📱 **Przykład Użycia**

### **Scenariusz 1: Quick Contact**
1. Użytkownik widzi ciekawy telefon w tabeli
2. **Klika w numer** telefonu (cyan link)
3. **Popup się otwiera** z pełnymi detalami
4. **Klika "Zadzwoń"** - otwiera się telefon
5. **Dzwoni** bezpośrednio do klienta

### **Scenariusz 2: Szybki Przegląd**
1. Manager chce sprawdzić **status klienta**
2. **Klika w telefon** zamiast otwierać edycję
3. **Widzi status, właściciela, ostatnią edycję**
4. **Zamyka popup** - kontynuuje pracę

### **Scenariusz 3: Weryfikacja Danych**
1. Pracownik ma **wątpliwości** co do klienta
2. **Klika w telefon** dla quick view
3. **Czyta notatki, sprawdza firmę, NIP**
4. **Klika email/website** dla dodatkowej weryfikacji

## 🔧 **Implementacja Techniczna**

### **Struktura Komponentu**
```typescript
interface ClientDetailsPopupProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
}
```

### **Walidacja Danych**
```typescript
if (!client) return null // Bezpieczne wyświetlanie
```

### **Condition Rendering**
```typescript
{client.website && (
  // Sekcja WWW tylko gdy istnieje
)}

{client.owner && (
  // Sekcja właściciela tylko gdy przypisany
)}
```

## 🎨 **Sekcje Popup**

### **1. Header** (Avatar + Nazwa + X)
### **2. Status + Last Edit** (Badge + Data)
### **3. Contact Info** (Phone, Email, Company, NIP, WWW)
### **4. Owner** (jeśli istnieje)
### **5. Notes** (jeśli istnieją)
### **6. Dates** (Created + Updated)
### **7. Actions** (Call, Email, Close)

---

## 🎉 **Efekt Końcowy**

**Kliknięcie w telefon teraz otwiera piękny, informatywny popup z:**

✅ **Pełnymi detalami klienta**  
✅ **Klikalnym telefonem i emailem**  
✅ **Statusem i właścicielem**  
✅ **Datami edycji**  
✅ **Notatkami**  
✅ **Szybkimi akcjami** (Zadzwoń/Email)  
✅ **Eleganckim dark theme**  
✅ **Responsywnym designem**  

**To znacznie usprawnia workflow call center!** 📞✨

---

*Ostatnia aktualizacja: Grudzień 2024*  
*Status: ✅ Gotowy do użytku* 