'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Language, useTranslation } from '@/lib/translations'
import { useStore } from '@/store/useStore'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { user } = useStore()
  const [language, setLanguageState] = useState<Language>('pl')
  
  // Pobierz język z profilu użytkownika lub localStorage
  useEffect(() => {
    if (user?.language) {
      setLanguageState(user.language)
    } else {
      // Fallback do localStorage lub domyślnego języka
      const savedLanguage = localStorage.getItem('app-language') as Language
      if (savedLanguage && ['pl', 'en', 'sk'].includes(savedLanguage)) {
        setLanguageState(savedLanguage)
      }
    }
  }, [user])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('app-language', lang)
  }

  const { t } = useTranslation(language)

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
} 