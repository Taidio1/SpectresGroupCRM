'use client'

import { useState, useRef } from 'react'
import { User } from '@/lib/supabase'
import { supabase, authApi } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Camera, Save, X, AlertCircle, Languages } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useTranslation, AVAILABLE_LANGUAGES, Language } from '@/lib/translations'

interface UserSettingsFormProps {
  user: User
}

export function UserSettingsForm({ user }: UserSettingsFormProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Stany formularza
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
    avatar_url: user.avatar_url || '',
    language: (user.language || 'pl') as Language
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Funkcja do uploadowania avatara
  const handleAvatarUpload = async (file: File) => {
    if (!file) return
    
    // Sprawdź rozmiar pliku (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Błąd",
        description: "Plik jest za duży. Maksymalny rozmiar to 5MB.",
        variant: "destructive"
      })
      return
    }

    // Sprawdź typ pliku
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Błąd", 
        description: "Możesz uploadować tylko pliki graficzne.",
        variant: "destructive"
      })
      return
    }

    setIsUploadingAvatar(true)
    
    try {
      // Utwórz unikalną nazwę pliku
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload do Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true // Nadpisz jeśli istnieje
        })

      if (uploadError) {
        throw uploadError
      }

      // Pobierz publiczny URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = urlData.publicUrl

      // Zaktualizuj URL w bazie danych
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Zaktualizuj stan formularza
      setFormData(prev => ({ ...prev, avatar_url: avatarUrl }))
      setAvatarPreview(avatarUrl)

      toast({
        title: "Sukces",
        description: "Zdjęcie profilowe zostało zaktualizowane"
      })

    } catch (error) {
      console.error('Błąd uploadu avatara:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować zdjęcia profilowego",
        variant: "destructive"
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Handler dla wyboru pliku
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Pokaż podgląd
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Upload pliku
      handleAvatarUpload(file)
    }
  }

  // Funkcja do zapisywania zmian profilu
  const handleSaveProfile = async () => {
    setIsLoading(true)
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          bio: formData.bio
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      toast({
        title: "Sukces",
        description: "Profil został zaktualizowany"
      })

    } catch (error) {
      console.error('Błąd zapisywania profilu:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować profilu",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funkcja do zmiany języka z natychmiastowym zapisem
  const handleLanguageChange = async (newLanguage: Language) => {
    const oldLanguage = formData.language
    
    // Zaktualizuj stan lokalnie
    setFormData(prev => ({ ...prev, language: newLanguage }))
    
    try {
      // Zapisz w bazie danych
      await authApi.updateUserLanguage(user.id, newLanguage)
      
      toast({
        title: "Język zmieniony",
        description: `Język został zmieniony na ${AVAILABLE_LANGUAGES[newLanguage].name}`
      })
      
    } catch (error) {
      console.error('Błąd zmiany języka:', error)
      
      // Przywróć poprzedni język w przypadku błędu
      setFormData(prev => ({ ...prev, language: oldLanguage }))
      
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić języka",
        variant: "destructive"
      })
    }
  }

  // Funkcja do usunięcia avatara
  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true)
    
    try {
      // Usuń z Storage jeśli istnieje
      if (formData.avatar_url && formData.avatar_url.includes('avatars/')) {
        const filePath = formData.avatar_url.split('avatars/')[1]
        await supabase.storage
          .from('avatars')
          .remove([filePath])
      }

      // Zaktualizuj w bazie danych
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      setFormData(prev => ({ ...prev, avatar_url: '' }))
      setAvatarPreview(null)

      toast({
        title: "Sukces",
        description: "Zdjęcie profilowe zostało usunięte"
      })

    } catch (error) {
      console.error('Błąd usuwania avatara:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć zdjęcia profilowego",
        variant: "destructive"
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'szef': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'pracownik': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-start gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage 
              src={avatarPreview || formData.avatar_url || '/placeholder-user.jpg'} 
              alt={formData.full_name}
              className="object-cover"
            />
            <AvatarFallback className="bg-slate-700 text-slate-300 text-lg">
              {formData.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
              }
            </AvatarFallback>
          </Avatar>
          
          {/* Remove Avatar Button */}
          {(formData.avatar_url || avatarPreview) && (
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemoveAvatar}
              disabled={isUploadingAvatar}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-white font-medium mb-2">Zdjęcie profilowe</h3>
          <p className="text-slate-400 text-sm mb-4">
            Dodaj zdjęcie profilowe, aby ułatwić innym rozpoznanie Cię
          </p>
          
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isUploadingAvatar ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {isUploadingAvatar ? 'Uploading...' : 'Zmień zdjęcie'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <p className="text-xs text-slate-500 mt-2">
            Maksymalny rozmiar: 5MB. Formaty: JPEG, PNG, WebP, GIF
          </p>
        </div>
      </div>

      <Separator className="bg-slate-700" />

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-white font-medium">Informacje osobiste</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name" className="text-slate-300">
              Imię i nazwisko
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Wprowadź imię i nazwisko"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-slate-800 border-slate-600 text-slate-400"
              placeholder="Wprowadź email"
            />
            <p className="text-xs text-slate-500 mt-1">
              Email nie może być zmieniony z poziomu aplikacji
            </p>
          </div>

          <div>
            <Label htmlFor="phone" className="text-slate-300">
              Telefon
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Wprowadź numer telefonu"
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-slate-300">
              Rola
            </Label>
            <div className="mt-2">
              <Badge className={getRoleBadgeColor(user.role)}>
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="bio" className="text-slate-300">
            O mnie
          </Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            className="bg-slate-700 border-slate-600 text-white"
            placeholder="Opowiedz coś o sobie..."
            rows={3}
          />
        </div>
      </div>

      <Separator className="bg-slate-700" />

      {/* Language Section */}
      <div className="space-y-4">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Ustawienia językowe
        </h3>
        
        <div>
          <Label htmlFor="language" className="text-slate-300">
            Wybierz język aplikacji
          </Label>
          <Select
            value={formData.language}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Wybierz język" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AVAILABLE_LANGUAGES).map(([code, lang]) => (
                <SelectItem key={code} value={code}>
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            Język zostanie zastosowany po zapisaniu ustawień
          </p>
        </div>
      </div>

      {/* Account Information */}
      <div className="space-y-4">
        <h3 className="text-white font-medium">Informacje o koncie</h3>
        
        <Alert className="border-slate-600 bg-slate-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-slate-300">
            Konto utworzone: {new Date(user.created_at).toLocaleDateString('pl-PL')}
            <br />
            ID użytkownika: <code className="text-cyan-400">{user.id}</code>
          </AlertDescription>
        </Alert>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveProfile}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>
    </div>
  )
} 