'use client'

import { User } from '@/lib/supabase'
import { useTranslation, AVAILABLE_LANGUAGES, Language } from '@/lib/translations'
import { Badge } from '@/components/ui/badge'
import { Languages } from 'lucide-react'

interface LanguageIndicatorProps {
  user: User
  className?: string
}

export function LanguageIndicator({ user, className = '' }: LanguageIndicatorProps) {
  const currentLanguage = user.language || 'pl'
  const languageInfo = AVAILABLE_LANGUAGES[currentLanguage as Language]
  const { t } = useTranslation(currentLanguage as Language)

  return (
    <Badge 
      variant="outline" 
      className={`bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 ${className}`}
    >
      <Languages className="h-3 w-3 mr-1" />
      {languageInfo.flag} {languageInfo.name}
    </Badge>
  )
} 