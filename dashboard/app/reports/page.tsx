import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, FileText, TrendingUp, Phone, Target, Award } from "lucide-react"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function ReportsPage() {
  return (
    <ProtectedLayout title="Centrum Raportów" subtitle="Szybki dostęp do analiz i statystyk">
      <div className="w-full h-full">
        {/* Szybki przegląd */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Phone className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-cyan-400">838</div>
              <div className="text-sm text-slate-400">Łączne telefony</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-400">69.3%</div>
              <div className="text-sm text-slate-400">Średnia konwersja</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-400">5</div>
              <div className="text-sm text-slate-400">Aktywnych pracowników</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Award className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-400">84.2%</div>
              <div className="text-sm text-slate-400">Ogólna efektywność</div>
            </CardContent>
          </Card>
        </div>

        {/* Główne sekcje raportów */}
        <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Raport Ogólne */}
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition-all">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-10 w-10 text-cyan-400" />
              </div>
              <CardTitle className="text-white text-2xl">Raporty - Ogólne</CardTitle>
              <p className="text-slate-400">
                Kompleksowe statystyki zespołowe i trendy wydajności
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="text-slate-300">Trendy zespołowe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-slate-300">Wykresy porównawcze</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-slate-300">Rozkład statusów</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-slate-300">Analiza miesięczna</span>
                </div>
              </div>
              <Link href="/reports/general" className="block">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                  Przejdź do raportu ogólnego
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Raport Szczegóły */}
          <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-all">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-green-400" />
              </div>
              <CardTitle className="text-white text-2xl">Raport - Szczegóły</CardTitle>
              <p className="text-slate-400">
                Szczegółowa analiza wydajności poszczególnych pracowników
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-slate-300">Tabela pracowników</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-slate-300">Indywidualne metryki</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-slate-300">Analiza statusów</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-slate-300">Sortowanie i filtry</span>
                </div>
              </div>
              <Link href="/reports/details" className="block">
                <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                  Przejdź do raportu szczegółowego
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Sekcja dodatkowa - szybkie akcje */}
        <div className="mt-12 max-w-4xl mx-auto">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-center">Szybkie akcje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Button variant="outline" className="border-slate-600 hover:bg-slate-700">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Eksportuj raporty
                </Button>
                <Button variant="outline" className="border-slate-600 hover:bg-slate-700">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Porównaj okresy
                </Button>
                <Button variant="outline" className="border-slate-600 hover:bg-slate-700">
                  <Users className="h-4 w-4 mr-2" />
                  Analiza zespołu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
} 