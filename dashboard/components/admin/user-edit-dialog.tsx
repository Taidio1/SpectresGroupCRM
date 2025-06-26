"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Edit, Save, X, TrendingUp, Network } from "lucide-react"
import { User, authApi } from "@/lib/supabase"
import { useAuth } from "@/store/useStore"

interface UserEditDialogProps {
  user: User
  onUserUpdated: (updatedUser: User) => void
  trigger?: React.ReactNode
}

export function UserEditDialog({ user, onUserUpdated, trigger }: UserEditDialogProps) {
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    bio: user.bio || '',
    language: user.language || 'pl',
    manager_id: user.manager_id || undefined
  })

  // Sprawdź czy aktualny użytkownik może promować
  const canPromoteToProjectManager = currentUser && ['szef', 'admin'].includes(currentUser.role) && user.role === 'junior_manager'

  // Reset form data when user changes
  useEffect(() => {
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      bio: user.bio || '',
      language: user.language || 'pl',
      manager_id: user.manager_id || undefined
    })
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setLoading(true)

    try {
      console.log('Updating user:', user.id, formData)
      
      // Prawdziwa aktualizacja przez API
      const updatedUser = await authApi.updateUser(user.id, formData, currentUser)
      
      // Wywołaj callback z zaktualizowanymi danymi
      onUserUpdated(updatedUser)
      
      toast({
        title: "✅ Sukces",
        description: `Dane użytkownika ${formData.full_name} zostały zaktualizowane`,
        duration: 5000
      })
      
      setOpen(false)
      
    } catch (error) {
      console.error('❌ Błąd aktualizacji użytkownika:', error)
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd'
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteToProjectManager = async () => {
    if (!currentUser) return

    setPromoting(true)

    try {
      console.log('Promoting user to Project Manager:', user.id)
      
      // Promuj użytkownika do Project Manager
      const updatedUser = await authApi.promoteToProjectManager(user.id, currentUser)
      
      // Aktualizuj formularz
      setFormData(prev => ({ ...prev, role: 'project_manager' }))
      
      // Wywołaj callback z zaktualizowanymi danymi
      onUserUpdated(updatedUser)
      
      toast({
        title: "🚀 Sukces",
        description: `${user.full_name} został promowany do roli Project Manager`,
        duration: 5000
      })
      
    } catch (error) {
      console.error('❌ Błąd promowania użytkownika:', error)
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd'
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setPromoting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Edit className="h-5 w-5 text-cyan-400" />
            Edytuj Użytkownika
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Imię i nazwisko */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-slate-300">
                Imię i nazwisko *
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            
            {/* Rola */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-300">
                Rola *
              </Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="pracownik">Pracownik</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="junior_manager">Junior Manager</SelectItem>
                  <SelectItem value="szef">Szef</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Telefon */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">
                Telefon
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="+48 123 456 789"
              />
            </div>
            
            {/* Język */}
            <div className="space-y-2">
              <Label htmlFor="language" className="text-slate-300">
                Język
              </Label>
              <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="pl">Polski</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sk">Slovenčina</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
          </div>
          
          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-slate-300">
              Opis / Bio
            </Label>
            <Input
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Krótki opis użytkownika..."
            />
          </div>
          
          {/* Zarządzanie hierarchią - sekcja dla Junior Managerów */}
          {currentUser && ['szef', 'admin'].includes(currentUser.role) && user.role === 'junior_manager' && (
            <div className="space-y-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-400" />
                <h3 className="text-white font-medium">Hierarchia Zarządzania</h3>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Project Manager</label>
                <Select 
                  value={formData.manager_id || ""} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value || undefined }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Przypisz do Project Manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="">Brak przypisania</SelectItem>
                    {/* Tu będą dynamicznie ładowani project managerowie */}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  Przypisanie Junior Manager do Project Manager przeniesie również wszystkich jego pracowników
                </p>
              </div>
            </div>
          )}

          {/* Przycisk promowania do Project Manager */}
          {canPromoteToProjectManager && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-amber-400 font-medium">Promocja do Project Manager</h4>
                  <p className="text-sm text-slate-400 mt-1">
                    Użytkownik kwalifikuje się do promocji na stanowisko Project Manager
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handlePromoteToProjectManager}
                  disabled={promoting || loading}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {promoting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  {promoting ? 'Promowanie...' : 'Promuj do PM'}
                </Button>
              </div>
            </div>
          )}

          {/* Przyciski */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-600">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || promoting}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="h-4 w-4 mr-2" />
              Anuluj
            </Button>
            
            <Button
              type="submit"
              disabled={loading || promoting}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </div>
          
        </form>
        
        {/* Informacje dodatkowe */}
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-xs text-slate-400">
            <strong>ID użytkownika:</strong> {user.id}
          </p>
          <p className="text-xs text-slate-400">
            <strong>Utworzony:</strong> {new Date(user.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-slate-400">
            <strong>Ostatnia aktualizacja:</strong> {new Date(user.updated_at).toLocaleString()}
          </p>
        </div>
        
      </DialogContent>
    </Dialog>
  )
} 