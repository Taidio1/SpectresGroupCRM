# 🔔 System Powiadomień - Instrukcje Użycia

## 📋 Przegląd

System powiadomień SpectresGroupCRM umożliwia wyświetlanie, zarządzanie i konfigurację powiadomień w czasie rzeczywistym. Dzwonka w prawym górnym rogu jest teraz w pełni funkcjonalny i oferuje kompleksowe zarządzanie powiadomieniami.

## ✨ Funkcjonalności

### 🔔 **Przycisk Powiadomień**
- **Lokalizacja:** Prawy górny róg aplikacji (obok avatara użytkownika)
- **Licznik:** Czerwona kropka z liczbą nieprzeczytanych powiadomień
- **Kliknięcie:** Otwiera dropdown z listą powiadomień

### 📱 **Dropdown Powiadomień**
- **Nagłówek:** Tytuł + przycisk "Oznacz wszystkie jako przeczytane"
- **Lista:** Scrollowalna lista powiadomień (max 50)
- **Akcje:** Każde powiadomienie można oznaczyć jako przeczytane lub usunąć

### 💾 **Trwałość Danych**
- **LocalStorage:** Powiadomienia są zapisywane w przeglądarce
- **Auto-sync:** Automatyczne zapisywanie przy każdej zmianie
- **Limit:** Maksymalnie 50 powiadomień (starsze automatycznie usuwane)

## 🎨 **Typy Powiadomień**

### 👤 **Client (Niebieski)**
- Ikona: `UserPlus`
- Przykład: "Nowy klient przypisany"
- Użycie: Przypisywanie nowych klientów

### ⏰ **Reminder (Żółty)**
- Ikona: `Clock`
- Przykład: "Przypomnienie o kontakcie"
- Użycie: Zaplanowane spotkania/rozmowy

### ✅ **Success (Zielony)**
- Ikona: `CheckCircle`
- Przykład: "Status zmieniony na 'sale'"
- Użycie: Powodzenia operacji

### ⚠️ **Warning (Pomarańczowy)**
- Ikona: `Bell`
- Przykład: "Problem z połączeniem"
- Użycie: Ostrzeżenia

### ❌ **Error (Czerwony)**
- Ikona: `X`
- Przykład: "Błąd systemu"
- Użycie: Błędy i problemy

### ℹ️ **Info (Szary)**
- Ikona: `Bell`
- Przykład: "Aktualizacja systemu"
- Użycie: Informacje ogólne

## 🛠️ **Implementacja dla Programistów**

### 1. **Użycie Hook'a useGlobalNotifications**

```typescript
import { useGlobalNotifications } from '@/hooks/useNotifications'

function SomeComponent() {
  const { notifyGlobalClientAssigned, notifyGlobalError } = useGlobalNotifications()
  
  const handleClientAssign = (clientName: string) => {
    // Logika przypisywania...
    notifyGlobalClientAssigned(clientName)
  }
  
  const handleError = (error: string) => {
    notifyGlobalError(error)
  }
}
```

### 2. **Bezpośrednie Dodawanie Powiadomień**

```typescript
import { NotificationTemplates } from '@/lib/notifications'

// W dowolnym miejscu w aplikacji
if (typeof window !== 'undefined' && (window as any).addNotification) {
  (window as any).addNotification(
    NotificationTemplates.clientStatusChanged("ABC Corp", "sale")
  )
}
```

### 3. **Tworzenie Własnych Powiadomień**

```typescript
import { createNotification } from '@/lib/notifications'

const customNotification = createNotification(
  'info',
  'Własny tytuł',
  'Własna wiadomość',
  '/optional-url'
)

// Dodaj do systemu
(window as any).addNotification(customNotification)
```

## 📦 **Dostępne Szablony (NotificationTemplates)**

### **Klienci:**
- `clientAssigned(clientName)` - Nowy klient przypisany
- `clientStatusChanged(clientName, newStatus)` - Zmiana statusu klienta
- `clientReminder(clientName, time)` - Przypomnienie o kontakcie

### **System:**
- `systemUpdate(version)` - Aktualizacja systemu
- `backupCompleted()` - Kopia zapasowa ukończona
- `systemError(errorMessage)` - Błąd systemu
- `connectionError()` - Problem z połączeniem

### **Użytkownicy:**
- `newUserRegistered(userName)` - Nowy użytkownik
- `fileUploaded(fileName, count)` - Plik wgrany
- `permissionDenied(action)` - Brak uprawnień

### **Dane:**
- `dataExported(fileName)` - Eksport danych
- `highActivity(count)` - Wysoka aktywność

## 🎛️ **Ustawienia Powiadomień**

### **Dostępne Opcje:**
```typescript
interface NotificationSettings {
  enableSound: boolean           // Dźwięk powiadomień
  enableDesktop: boolean         // Powiadomienia systemowe
  enableClientReminders: boolean // Przypomnienia o klientach
  enableSystemUpdates: boolean   // Aktualizacje systemu
  enableStatusChanges: boolean   // Zmiany statusów
}
```

### **Domyślne Ustawienia:**
- 🔊 **Dźwięk:** ✅ Włączony
- 🖥️ **Desktop:** ❌ Wyłączony
- 👤 **Przypomnienia:** ✅ Włączony
- 🔄 **Aktualizacje:** ✅ Włączony  
- 📊 **Statusy:** ✅ Włączony

## 🎯 **Przykłady Użycia**

### **1. Powiadomienie o Nowym Kliencie**
```typescript
// Po przypisaniu klienta w components/clients-table.tsx
import { useGlobalNotifications } from '@/hooks/useNotifications'

const { notifyGlobalClientAssigned } = useGlobalNotifications()

const handleAssignClient = (client) => {
  // Logika przypisywania...
  notifyGlobalClientAssigned(`${client.first_name} ${client.last_name}`)
}
```

### **2. Powiadomienie o Błędzie**
```typescript
// W przypadku błędu API
const { notifyGlobalError } = useGlobalNotifications()

try {
  await apiCall()
} catch (error) {
  notifyGlobalError(error.message)
}
```

### **3. Powiadomienie o Sukcesie**
```typescript
// Po pomyślnym wgraniu pliku
const { notifyGlobalFileUploaded } = useGlobalNotifications()

const handleFileUpload = (fileName: string, clientCount: number) => {
  // Logika wgrywania...
  notifyGlobalFileUploaded(fileName, clientCount)
}
```

## 🔧 **Konfiguracja Zaawansowana**

### **Hook useNotifications (Lokalny)**
```typescript
import { useNotifications } from '@/hooks/useNotifications'

function NotificationManager() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    addNotification,
    settings,
    updateSettings 
  } = useNotifications()
  
  return (
    <div>
      <p>Nieprzeczytane: {unreadCount}</p>
      <button onClick={() => updateSettings({ enableSound: false })}>
        Wyłącz dźwięk
      </button>
      {/* Render notifications... */}
    </div>
  )
}
```

### **Bezpośrednie Operacje na Storage**
```typescript
import { 
  loadNotificationsFromStorage,
  saveNotificationsToStorage,
  loadNotificationSettings,
  saveNotificationSettings
} from '@/lib/notifications'

// Ładowanie
const notifications = loadNotificationsFromStorage()
const settings = loadNotificationSettings()

// Zapisywanie
saveNotificationsToStorage(notifications)
saveNotificationSettings(settings)
```

## 🎵 **Funkcje Audio i Desktop**

### **Dźwięk Powiadomienia**
```typescript
import { playNotificationSound } from '@/lib/notifications'

playNotificationSound() // Odtwarza prosty dźwięk powiadomienia
```

### **Powiadomienia Systemowe**
```typescript
import { showBrowserNotification } from '@/lib/notifications'

const notification = createNotification('info', 'Tytuł', 'Wiadomość')
showBrowserNotification(notification) // Wymaga uprawnień przeglądarki
```

## 📊 **Statystyki i Monitoring**

### **Podstawowe Statystyki**
```typescript
const { notifications, unreadCount, totalCount } = useNotifications()

console.log(`Łącznie: ${totalCount}, Nieprzeczytane: ${unreadCount}`)
```

### **Filtrowanie**
```typescript
const errorNotifications = notifications.filter(n => n.type === 'error')
const todayNotifications = notifications.filter(n => 
  n.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
)
```

## 🚀 **Roadmapa i Rozszerzenia**

### **Planowane Funkcjonalności:**
- 🔄 Integracja z API backend
- 📧 Powiadomienia email
- 📱 Push notifications
- 🕐 Zaplanowane powiadomienia
- 🎯 Filtrowanie i kategorie
- 📈 Analityka powiadomień

### **Możliwe Rozszerzenia:**
- 🔗 Akcje w powiadomieniach (przyciski)
- 🎨 Niestandardowe style
- 🔄 Real-time synchronizacja między kartami
- 📂 Grupowanie powiadomień
- 🎛️ Zaawansowane ustawienia per typ

## 💡 **Najlepsze Praktyki**

1. **Używaj odpowiednich typów** - Każdy typ ma swój kolor i ikonę
2. **Krótkie i jasne tytuły** - Maksymalnie 50 znaków
3. **Szczegółowe opisy** - Wyjaśnij co się stało i co robić dalej
4. **Nie spamuj** - Zbyt wiele powiadomień może denerwować
5. **Używaj szablonów** - NotificationTemplates dla spójności
6. **Testuj uprawnienia** - Powiadomienia desktop wymagają zgody użytkownika

## 🔍 **Debugging i Troubleshooting**

### **Powiadomienia nie pojawiają się:**
1. Sprawdź console czy są błędy JavaScript
2. Zweryfikuj czy localStorage jest dostępny
3. Upewnij się że globalny hook jest załadowany

### **Brak dźwięku:**
1. Sprawdź ustawienia przeglądarki (auto-play policy)
2. Zweryfikuj że enableSound = true
3. Test na różnych przeglądarkach

### **Problemy z localStorage:**
1. Sprawdź limit miejsca w przeglądarce
2. Wyczyść localStorage: `localStorage.clear()`
3. Sprawdź tryb prywatny (może blokować localStorage)

## ✅ **Zakończenie**

System powiadomień jest teraz w pełni funkcjonalny i gotowy do użycia! 

**Główne korzyści:**
- ✅ Przycisk dzwonka działa
- ✅ Persistentne powiadomienia
- ✅ Różne typy i style
- ✅ Łatwa integracja
- ✅ Konfigurowalne ustawienia
- ✅ Gotowe szablony

**Dla użytkowników:** Kliknij dzwonka w prawym górnym rogu aby zobaczyć powiadomienia!

**Dla programistów:** Używaj `useGlobalNotifications()` hook'a aby dodawać powiadomienia z dowolnego miejsca w aplikacji.

---
*Dokumentacja wygenerowana automatycznie - System Powiadomień v1.0* 🔔 