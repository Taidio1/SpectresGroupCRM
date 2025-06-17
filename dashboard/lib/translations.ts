// Definicje języków
export type Language = 'pl' | 'en' | 'sk'

// Dostępne języki z nazwami wyświetlanymi
export const AVAILABLE_LANGUAGES = {
  pl: { name: 'Polski', flag: '🇵🇱' },
  en: { name: 'English', flag: '🇬🇧' },
  sk: { name: 'Slovenčina', flag: '🇸🇰' }
} as const

// Tłumaczenia - kompletne dla całej aplikacji
export const translations = {
  pl: {
    // Ogólne
    language: 'Język',
    save: 'Zapisz',
    cancel: 'Anuluj',
    loading: 'Ładowanie...',
    error: 'Błąd',
    success: 'Sukces',
    edit: 'Edytuj',
    delete: 'Usuń',
    add: 'Dodaj',
    search: 'Szukaj',
    filter: 'Filtruj',
    reset: 'Resetuj',
    close: 'Zamknij',
    
    // Nawigacja
    navigation: {
      dashboard: 'Dashboard',
      clients: 'Klienci', 
      reports: 'Raporty',
      settings: 'Ustawienia',
      logout: 'Wyloguj'
    },
    
    // Klienci
    clients: {
      title: 'Zarządzanie Klientami',
      searchClients: 'Szukaj klientów...',
      filterByOwner: 'Filtruj po właścicielu',
      allOwners: 'Wszyscy właściciele',
      noOwner: 'Bez właściciela',
      resetFilters: 'Resetuj filtry',
      employeeInfo: 'Widzisz wszystkich klientów i ich właścicieli, ale możesz filtrować tylko swoich klientów',
      
      // Pola
      firstName: 'Imię',
      lastName: 'Nazwisko',
      company: 'Firma',
      phone: 'Telefon',
      email: 'Email',
      status: 'Status',
      owner: 'Właściciel',
      
      // Statusy
      statuses: {
        canvas: 'Canvas',
        brak_kontaktu: 'Brak kontaktu',
        nie_zainteresowany: 'Nie zainteresowany',
        zdenerwowany: 'Zdenerwowany',
        antysale: 'Anti-sale',
        sale: 'Sprzedaż',
        '$$': 'Płatny'
      }
    },
    
    // Ustawienia
    settings: {
      title: 'Ustawienia',
      languageSettings: 'Ustawienia językowe',
      selectLanguage: 'Wybierz język aplikacji',
      languageChanged: 'Język został zmieniony'
    }
  },
  
  en: {
    // General
    language: 'Language',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    reset: 'Reset',
    close: 'Close',
    
    // Navigation
    navigation: {
      dashboard: 'Dashboard',
      clients: 'Clients',
      reports: 'Reports', 
      settings: 'Settings',
      logout: 'Logout'
    },
    
    // Clients
    clients: {
      title: 'Client Management',
      searchClients: 'Search clients...',
      filterByOwner: 'Filter by owner',
      allOwners: 'All owners',
      noOwner: 'No owner',
      resetFilters: 'Reset filters',
      employeeInfo: 'You can see all clients and their owners, but can only filter your own clients',
      
      // Fields
      firstName: 'First Name',
      lastName: 'Last Name', 
      company: 'Company',
      phone: 'Phone',
      email: 'Email',
      status: 'Status',
      owner: 'Owner',
      
      // Statuses
      statuses: {
        canvas: 'Canvas',
        brak_kontaktu: 'No contact',
        nie_zainteresowany: 'Not interested',
        zdenerwowany: 'Angry',
        antysale: 'Anti-sale',
        sale: 'Sale',
        '$$': 'Paid'
      }
    },
    
    // Settings
    settings: {
      title: 'Settings',
      languageSettings: 'Language Settings',
      selectLanguage: 'Select application language',
      languageChanged: 'Language has been changed'
    }
  },
  
  sk: {
    // Všeobecné
    language: 'Jazyk',
    save: 'Uložiť',
    cancel: 'Zrušiť',
    loading: 'Načítava...',
    error: 'Chyba',
    success: 'Úspech',
    edit: 'Upraviť',
    delete: 'Vymazať',
    add: 'Pridať',
    search: 'Hľadať',
    filter: 'Filtrovať',
    reset: 'Resetovať',
    close: 'Zavrieť',
    
    // Navigácia
    navigation: {
      dashboard: 'Dashboard',
      clients: 'Klienti',
      reports: 'Reporty',
      settings: 'Nastavenia',
      logout: 'Odhlásiť'
    },
    
    // Klienti
    clients: {
      title: 'Správa Klientov',
      searchClients: 'Hľadať klientov...',
      filterByOwner: 'Filtrovať podľa vlastníka',
      allOwners: 'Všetci vlastníci',
      noOwner: 'Bez vlastníka',
      resetFilters: 'Resetovať filtre',
      employeeInfo: 'Vidíte všetkých klientov a ich vlastníkov, ale môžete filtrovať len svojich klientov',
      
      // Polia
      firstName: 'Meno',
      lastName: 'Priezvisko',
      company: 'Spoločnosť',
      phone: 'Telefón',
      email: 'Email',
      status: 'Status',
      owner: 'Vlastník',
      
      // Statusy
      statuses: {
        canvas: 'Canvas',
        brak_kontaktu: 'Bez kontaktu',
        nie_zainteresowany: 'Nezaujíma sa',
        zdenerwowany: 'Nahnevaný',
        antysale: 'Anti-predaj',
        sale: 'Predaj',
        '$$': 'Platený'
      }
    },
    
    // Nastavenia
    settings: {
      title: 'Nastavenia',
      languageSettings: 'Nastavenia jazyka',
      selectLanguage: 'Vybrať jazyk aplikácie',
      languageChanged: 'Jazyk bol zmenený'
    }
  }
} as const

// Hook dla tłumaczeń
export function useTranslation(language: Language = 'pl') {
  return {
    t: (key: string) => {
      const keys = key.split('.')
      let value: any = translations[language]
      
      for (const k of keys) {
        value = value?.[k]
      }
      
      return value || key
    },
    language,
    availableLanguages: AVAILABLE_LANGUAGES
  }
} 