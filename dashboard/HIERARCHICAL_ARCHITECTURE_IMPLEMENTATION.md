# 🏢 **Implementacja Architektury Hierarchicznej - Spectres Group CRM**

## 📋 **Przegląd Zmian**

### **Nowa Struktura Organizacyjna:**
```
Szef (CEO) - poziom 0
├── Polska
│   ├── Project Manager PL - poziom 1
│   │   ├── Junior Manager PL-1 - poziom 2
│   │   │   ├── Pracownik PL-1-1 - poziom 3
│   │   │   └── Pracownik PL-1-2 - poziom 3
│   │   └── Junior Manager PL-2 - poziom 2
│   └── Pracowniki bezpośredni PM - poziom 3
└── Słowacja
    ├── Project Manager SK - poziom 1
    │   ├── Junior Manager SK-1 - poziom 2
    │   └── Junior Manager SK-2 - poziom 2
    └── Pracownicy bezpośredni PM - poziom 3
```

## 🛠️ **Kroki Implementacji**

### **Krok 1: Migracja Bazy Danych**

```bash
# 1. Wykonaj główną migrację
psql -d your_database -f sql/organizational_structure_migration.sql

# 2. Dodaj optymalizacje wydajności
psql -d your_database -f sql/performance_optimizations.sql

# 3. Zaimportuj zapytania logiczne
psql -d your_database -f sql/hierarchy_queries.sql
```

### **Krok 2: Aktualizacja Backend API**

#### **Nowe interfejsy TypeScript:**

```typescript
// lib/supabase.ts - dodaj nowe interfejsy

export interface Location {
  id: string
  name: string
  code: 'PL' | 'SK'
  currency: 'PLN' | 'EUR'
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserHierarchy extends User {
  location_id?: string
  manager_id?: string
  role_hierarchy_level: number
  territory?: string
  start_date: string
  is_active: boolean
  location?: Location
  manager?: User
  subordinates?: User[]
  hierarchy_path?: string
}

export interface TeamStatistics {
  team_size: number
  total_sales: number
  total_revenue: number
  avg_efficiency: number
  employees_on_target: number
  employees_below_target: number
  urgent_interventions: number
}
```

#### **Nowe API funkcje:**

```typescript
// lib/supabase.ts - dodaj nowe API

export const hierarchyApi = {
  // Pobierz lokalizacje
  async getLocations(): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  },

  // Pobierz użytkowników z hierarchią
  async getUsersWithHierarchy(): Promise<UserHierarchy[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        location:locations(*),
        manager:users!manager_id(id, full_name, role),
        subordinates:users!manager_id(id, full_name, role)
      `)
      .eq('is_active', true)
      .order('role_hierarchy_level, full_name')
    
    if (error) throw error
    return data
  },

  // Sprawdź uprawnienia dostępu
  async checkUserAccess(viewerUuid: string, targetUuid: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_user_access', {
        viewer_uuid: viewerUuid,
        target_uuid: targetUuid
      })
    
    if (error) throw error
    return data
  },

  // Pobierz dostępnych użytkowników dla danej roli
  async getAccessibleUsers(viewerUuid: string): Promise<UserHierarchy[]> {
    const { data, error } = await supabase
      .rpc('get_accessible_users', { viewer_uuid: viewerUuid })
    
    if (error) throw error
    return data
  },

  // Statystyki zespołu dla managera
  async getTeamStatistics(managerUuid: string): Promise<TeamStatistics> {
    const { data, error } = await supabase
      .rpc('get_pm_team_stats', { pm_uuid: managerUuid })
      .single()
    
    if (error) throw error
    return data
  },

  // Przypisz managera do użytkownika
  async assignManager(userId: string, managerId: string | null, currentUser: User): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ 
        manager_id: managerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) throw error
  },

  // Pobierz podwładnych użytkownika
  async getSubordinates(managerUuid: string): Promise<User[]> {
    const { data, error } = await supabase
      .rpc('get_subordinates', { manager_uuid: managerUuid })
    
    if (error) throw error
    return data
  }
}
```

### **Krok 3: Aktualizacja Frontend Components**

#### **Nowy komponent HierarchyTree.tsx:**

```tsx
// components/hierarchy/hierarchy-tree.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { hierarchyApi, UserHierarchy } from "@/lib/supabase"
import { ChevronDown, ChevronRight, Users, MapPin } from "lucide-react"

interface HierarchyTreeProps {
  currentUser: UserHierarchy
}

export function HierarchyTree({ currentUser }: HierarchyTreeProps) {
  const [users, setUsers] = useState<UserHierarchy[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHierarchy()
  }, [])

  const loadHierarchy = async () => {
    try {
      const accessibleUsers = await hierarchyApi.getAccessibleUsers(currentUser.id)
      setUsers(accessibleUsers)
    } catch (error) {
      console.error('Błąd ładowania hierarchii:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (userId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedNodes(newExpanded)
  }

  const buildTree = (parentId: string | null = null): UserHierarchy[] => {
    return users.filter(user => user.manager_id === parentId)
  }

  const renderUser = (user: UserHierarchy, level: number = 0) => {
    const hasSubordinates = users.some(u => u.manager_id === user.id)
    const isExpanded = expandedNodes.has(user.id)

    return (
      <div key={user.id} className={`ml-${level * 4}`}>
        <div className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded">
          {hasSubordinates && (
            <button
              onClick={() => toggleExpand(user.id)}
              className="p-1 hover:bg-slate-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          
          <div className="flex items-center gap-2 flex-1">
            <div>
              <div className="font-medium text-white">{user.full_name}</div>
              <div className="text-sm text-slate-400">{user.email}</div>
            </div>
            
            <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
              {getRoleLabel(user.role)}
            </Badge>
            
            {user.location && (
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <MapPin className="h-3 w-3" />
                {user.location.name}
              </div>
            )}
            
            {hasSubordinates && (
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <Users className="h-3 w-3" />
                {users.filter(u => u.manager_id === user.id).length}
              </div>
            )}
          </div>
        </div>
        
        {hasSubordinates && isExpanded && (
          <div className="ml-4 border-l border-slate-600 pl-2">
            {buildTree(user.id).map(subordinate => 
              renderUser(subordinate, level + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'szef': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'project_manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'junior_manager': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'pracownik': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'szef': return 'CEO'
      case 'project_manager': return 'Project Manager'
      case 'junior_manager': return 'Junior Manager'
      case 'pracownik': return 'Pracownik'
      default: return role
    }
  }

  if (loading) {
    return <div>Ładowanie hierarchii...</div>
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Struktura Organizacyjna</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {buildTree().map(user => renderUser(user))}
        </div>
      </CardContent>
    </Card>
  )
}
```

#### **Nowy komponent TeamDashboard.tsx:**

```tsx
// components/hierarchy/team-dashboard.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { hierarchyApi, UserHierarchy, TeamStatistics } from "@/lib/supabase"
import { Users, TrendingUp, Target, AlertTriangle } from "lucide-react"

interface TeamDashboardProps {
  currentUser: UserHierarchy
}

export function TeamDashboard({ currentUser }: TeamDashboardProps) {
  const [teamStats, setTeamStats] = useState<TeamStatistics | null>(null)
  const [teamMembers, setTeamMembers] = useState<UserHierarchy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeamData()
  }, [currentUser.id])

  const loadTeamData = async () => {
    try {
      const [stats, members] = await Promise.all([
        hierarchyApi.getTeamStatistics(currentUser.id),
        hierarchyApi.getAccessibleUsers(currentUser.id)
      ])
      
      setTeamStats(stats)
      setTeamMembers(members.filter(m => m.id !== currentUser.id))
    } catch (error) {
      console.error('Błąd ładowania danych zespołu:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !teamStats) {
    return <div>Ładowanie danych zespołu...</div>
  }

  const efficiencyColor = teamStats.avg_efficiency >= 75 ? 'text-green-400' : 
                         teamStats.avg_efficiency >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      {/* Statystyki zespołu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-slate-400">Zespół</p>
                <p className="text-2xl font-bold text-white">{teamStats.team_size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-slate-400">Sprzedaż</p>
                <p className="text-2xl font-bold text-white">{teamStats.total_sales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm text-slate-400">Na celu</p>
                <p className="text-2xl font-bold text-white">{teamStats.employees_on_target}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm text-slate-400">Interwencje</p>
                <p className="text-2xl font-bold text-white">{teamStats.urgent_interventions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wydajność zespołu */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Wydajność Zespołu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">Średnia wydajność</span>
                <span className={`font-bold ${efficiencyColor}`}>
                  {teamStats.avg_efficiency.toFixed(1)}%
                </span>
              </div>
              <Progress value={teamStats.avg_efficiency} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Przychód zespołu:</span>
                <span className="ml-2 text-white font-medium">
                  €{teamStats.total_revenue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Poniżej celu:</span>
                <span className="ml-2 text-red-400 font-medium">
                  {teamStats.employees_below_target} osób
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista członków zespołu */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Członkowie Zespołu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-white">{member.full_name}</p>
                    <p className="text-sm text-slate-400">{member.email}</p>
                  </div>
                  <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-slate-400">
                    {member.location?.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions (same as in HierarchyTree)
const getRoleBadgeColor = (role: string) => {
  // ... same implementation
}

const getRoleLabel = (role: string) => {
  // ... same implementation  
}
```

### **Krok 4: Aktualizacja Sidebar i Nawigacji**

```tsx
// components/sidebar.tsx - aktualizuj funkcję getNavigationItems

const getNavigationItems = (user?: UserHierarchy) => {
  if (!user) return []
  
  const baseItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Users, label: "Klienci", href: "/clients" },
  ]

  // Hierarchia organizacyjna - dla managerów i wyżej
  if (['szef', 'admin', 'project_manager', 'junior_manager'].includes(user.role)) {
    baseItems.push({ 
      icon: Hierarchy, 
      label: "Struktura", 
      href: "/hierarchy" 
    })
  }

  // Zarządzanie zespołem - dla managerów
  if (['project_manager', 'junior_manager'].includes(user.role)) {
    baseItems.push({ 
      icon: UserCog, 
      label: "Zespół", 
      href: "/team" 
    })
  }

  // Moje statystyki - tylko dla pracowników
  if (user.role === 'pracownik') {
    baseItems.push({ 
      icon: Award, 
      label: "Moje statystyki", 
      href: "/my-stats" 
    })
  }

  // Raporty - dla manager, szef, admin
  if (['manager', 'project_manager', 'szef', 'admin'].includes(user.role)) {
    baseItems.push(
      { icon: BarChart3, label: "Raporty - Ogólne", href: "/reports/general" },
      { icon: FileText, label: "Raport - Szczegóły", href: "/reports/details" }
    )
  }

  // Kalendarz - dla wszystkich
  baseItems.push({ icon: Calendar, label: "Kalendarz", href: "/calendar" })

  return baseItems
}
```

### **Krok 5: Nowe Strony**

#### **app/hierarchy/page.tsx:**

```tsx
"use client"

import { useAuth } from "@/store/useStore"
import { HierarchyTree } from "@/components/hierarchy/hierarchy-tree"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HierarchyPage() {
  const { user } = useAuth()

  if (!user || !['szef', 'admin', 'project_manager', 'junior_manager'].includes(user.role)) {
    return (
      <div className="p-6">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <p className="text-red-400">Brak uprawnień do przeglądania struktury organizacyjnej.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Struktura Organizacyjna</h1>
        <p className="text-slate-400">
          Przegląd hierarchii zespołu i zarządzanie strukturą organizacyjną
        </p>
      </div>

      <HierarchyTree currentUser={user} />
    </div>
  )
}
```

#### **app/team/page.tsx:**

```tsx
"use client"

import { useAuth } from "@/store/useStore"
import { TeamDashboard } from "@/components/hierarchy/team-dashboard"
import { Card, CardContent } from "@/components/ui/card"

export default function TeamPage() {
  const { user } = useAuth()

  if (!user || !['project_manager', 'junior_manager'].includes(user.role)) {
    return (
      <div className="p-6">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <p className="text-red-400">Brak uprawnień do zarządzania zespołem.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Zarządzanie Zespołem</h1>
        <p className="text-slate-400">
          Dashboard zespołu, statystyki i zarządzanie wydajnością
        </p>
      </div>

      <TeamDashboard currentUser={user} />
    </div>
  )
}
```

### **Krok 6: Aktualizacja Store**

```typescript
// store/useStore.ts - rozszerz interfejs
interface AppState {
  // ... existing state ...
  
  // Nowe pola dla hierarchii
  locations: Location[]
  hierarchyUsers: UserHierarchy[]
  teamStatistics: TeamStatistics | null
  
  // Nowe akcje
  setLocations: (locations: Location[]) => void
  setHierarchyUsers: (users: UserHierarchy[]) => void
  setTeamStatistics: (stats: TeamStatistics | null) => void
}
```

## 🚀 **Testowanie i Walidacja**

### **1. Testy Bazy Danych:**

```sql
-- Sprawdź hierarchię
SELECT * FROM validate_hierarchy();

-- Test uprawnień
SELECT check_user_access('manager_uuid', 'employee_uuid');

-- Test funkcji team statistics
SELECT * FROM get_team_statistics('manager_uuid', '2024-01-01', '2024-12-31');
```

### **2. Testy Frontend:**

```bash
# Dodaj do package.json testów
npm run test:hierarchy
npm run test:team-dashboard
```

## 📊 **Monitoring i Maintenance**

### **Dzienne zadania automatyczne:**
- Odświeżanie materialized views (6:00)
- Aktualizacja cache hierarchii
- Monitoring wydajności zapytań

### **Tygodniowe zadania:**
- Czyszczenie starych cache'y
- Analiza wydajności indeksów
- Backup struktury hierarchii

### **Miesięczne zadania:**
- Archiwizacja starych statystyk
- Optymalizacja zapytań
- Raport wykorzystania systemu

## ✅ **Checklist Wdrożenia**

- [ ] Wykonanie migracji bazy danych
- [ ] Aktualizacja interfejsów TypeScript
- [ ] Implementacja nowych API funkcji
- [ ] Stworzenie komponentów hierarchii
- [ ] Aktualizacja nawigacji i uprawnień
- [ ] Testy funkcjonalności
- [ ] Szkolenie użytkowników
- [ ] Monitoring systemu

## 🔧 **Troubleshooting**

### **Częste problemy:**

1. **Cykliczne odwołania w hierarchii**
   ```sql
   SELECT * FROM validate_hierarchy();
   ```

2. **Problemy z wydajnością**
   ```sql
   SELECT * FROM analyze_query_performance();
   ```

3. **Nieaktualne cache**
   ```sql
   SELECT refresh_hierarchy_cache();
   ```

## 📈 **Metryki Sukcesu**

- ⚡ **Czas ładowania raportów** < 2s
- 🎯 **Dokładność uprawnień** 100%
- 📊 **Użycie indeksów** > 80%
- 🚀 **Satysfakcja użytkowników** > 90%

---

*Dokumentacja przygotowana dla Spectres Group CRM - Hierarchical Architecture v1.0* 