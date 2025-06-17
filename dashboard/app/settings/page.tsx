'use client'

import { useAuth } from '@/store/useStore'
import { ProtectedLayout } from '@/components/auth/protected-layout'
import { UserSettingsForm } from '@/components/settings/user-settings-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { User, Settings, Shield, Bell } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export default function SettingsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()

  if (!user) {
    return null
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t('settings.title')}</h1>
            <p className="text-slate-400">
              Zarządzaj swoimi ustawieniami konta i preferencjami
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Navigation Sidebar */}
            <Card className="lg:col-span-1 bg-slate-800 border-slate-700 h-fit">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Menu ustawień
                </CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  <a
                    href="#profile"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  >
                    <User className="h-4 w-4" />
                    Profil użytkownika
                  </a>
                  <a
                    href="#security"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Bezpieczeństwo
                  </a>
                  <a
                    href="#notifications"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                    Powiadomienia
                  </a>
                </nav>
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Profile Section */}
              <section id="profile">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Profil użytkownika</CardTitle>
                    <CardDescription className="text-slate-400">
                      Zarządzaj swoimi danymi osobowymi i zdjęciem profilowym
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UserSettingsForm user={user} />
                  </CardContent>
                </Card>
              </section>

              <Separator className="bg-slate-700" />

              {/* Security Section */}
              <section id="security">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Bezpieczeństwo</CardTitle>
                    <CardDescription className="text-slate-400">
                      Zarządzaj hasłem i ustawieniami bezpieczeństwa
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border border-slate-600 rounded-lg">
                        <h3 className="text-white font-medium mb-2">Zmiana hasła</h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Regularna zmiana hasła zwiększa bezpieczeństwo Twojego konta
                        </p>
                        <div className="text-amber-400 text-sm">
                          🚧 Funkcja zmiany hasła będzie dostępna wkrótce
                        </div>
                      </div>
                      
                      <div className="p-4 border border-slate-600 rounded-lg">
                        <h3 className="text-white font-medium mb-2">Sesje aktywne</h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Zarządzaj aktywymi sesjami w różnych urządzeniach
                        </p>
                        <div className="text-amber-400 text-sm">
                          🚧 Zarządzanie sesjami będzie dostępne wkrótce
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <Separator className="bg-slate-700" />

              {/* Notifications Section */}
              <section id="notifications">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Powiadomienia</CardTitle>
                    <CardDescription className="text-slate-400">
                      Konfiguruj sposób otrzymywania powiadomień
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border border-slate-600 rounded-lg">
                        <h3 className="text-white font-medium mb-2">Powiadomienia email</h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Otrzymuj powiadomienia o ważnych wydarzeniach na email
                        </p>
                        <div className="text-amber-400 text-sm">
                          🚧 Ustawienia powiadomień będą dostępne wkrótce
                        </div>
                      </div>
                      
                      <div className="p-4 border border-slate-600 rounded-lg">
                        <h3 className="text-white font-medium mb-2">Powiadomienia push</h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Otrzymuj powiadomienia push w przeglądarce
                        </p>
                        <div className="text-amber-400 text-sm">
                          🚧 Powiadomienia push będą dostępne wkrótce
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
} 