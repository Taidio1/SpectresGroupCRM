"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Eye, EyeOff, Loader2, UserPlus, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { authApi, locationsApi } from "@/lib/supabase"
import { LocationBadge } from "@/components/location-filter"
import Link from "next/link"

const registerSchema = z.object({
  fullName: z.string().min(2, "Imię i nazwisko musi mieć co najmniej 2 znaki"),
  email: z.string().email("Wprowadź prawidłowy adres email"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
  confirmPassword: z.string(),
  locationId: z.string().min(1, "Wybierz kraj")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"]
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [availableLocations, setAvailableLocations] = useState<any[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      locationId: ""
    }
  })

  // Ładowanie dostępnych lokalizacji
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true)
        const locations = await locationsApi.getAllLocations()
        setAvailableLocations(locations)
        
        // Automatycznie wybierz Polskę jako domyślną
        const polandLocation = locations.find(loc => loc.code === 'PL')
        if (polandLocation) {
          form.setValue('locationId', polandLocation.id)
        }
      } catch (error) {
        console.error('❌ Błąd ładowania lokalizacji:', error)
        toast({
          title: "Błąd",
          description: "Nie udało się załadować listy krajów",
          variant: "destructive"
        })
      } finally {
        setLoadingLocations(false)
      }
    }

    loadLocations()
  }, [form, toast])

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    
    try {
      const result = await authApi.signUp(data.email, data.password, data.fullName, data.locationId)
      
      if (result.user) {
        const selectedLocation = availableLocations.find(loc => loc.id === data.locationId)
        
        toast({
          title: "Rejestracja pomyślna",
          description: `Konto zostało utworzone w lokalizacji: ${selectedLocation?.name || 'Polska'}. Sprawdź swoją skrzynkę email w celu potwierdzenia konta.`,
        })
        
        // Przekieruj do strony logowania
        router.push("/login")
      }
    } catch (error: any) {
      console.error("Błąd rejestracji:", error)
      toast({
        title: "Błąd rejestracji",
        description: error.message || "Spróbuj ponownie później",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-slate-800 border-slate-700">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <UserPlus className="h-8 w-8 text-cyan-400" />
        </div>
        <CardTitle className="text-2xl text-center text-white">
          Utwórz konto
        </CardTitle>
        <CardDescription className="text-center text-slate-400">
          Wypełnij formularz aby założyć konto w systemie Spectres Group
        </CardDescription>
        {availableLocations.length > 0 && (
          <div className="text-center text-sm text-slate-500">
            Dostępne kraje: {availableLocations.map(loc => loc.name).join(', ')}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Imię i nazwisko</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jan Kowalski"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="twoj@email.com"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Kraj
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={loadingLocations}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue 
                          placeholder={loadingLocations ? "Ładowanie krajów..." : "Wybierz kraj"}
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {availableLocations.map((location) => (
                          <SelectItem 
                            key={location.id} 
                            value={location.id}
                            className="text-white hover:bg-slate-600"
                          >
                            <div className="flex items-center gap-2">
                              <LocationBadge location={location} />
                              <span>{location.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Hasło</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Potwierdź hasło</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={isLoading || loadingLocations}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tworzenie konta...
                </>
              ) : loadingLocations ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ładowanie krajów...
                </>
              ) : (
                "Utwórz konto"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Masz już konto?{" "}
            <Link 
              href="/login" 
              className="text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Zaloguj się
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 