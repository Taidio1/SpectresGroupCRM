"use client"

import { useState, useCallback } from "react"
import { 
  Search, Edit, Trash2, Save, X, Eye, Plus, 
  RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Phone, AlertCircle
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// 🚀 PERFORMANCE: Import optimized hooks instead of direct API calls
import { 
  useClients, 
  useClientsPaginated, 
  useCreateClient, 
  useUpdateClient, 
  useDeleteClient,
  useOptimisticClientUpdate,
  usePrefetchClient
} from "@/hooks/queries/use-clients"
import { useUsers, useOwners } from "@/hooks/queries/use-users"
import { useAuth } from "@/store/useStore"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { logger } from "@/lib/logger"
import { useDebounced } from "@/hooks/useDebounced"

// Status configuration
const statusOptions = [
  'canvas', 'brak_kontaktu', 'nie_zainteresowany', 
  'zdenerwowany', 'antysale', 'sale', '$$', 'nowy'
] as const

const statusColors = {
  'canvas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'brak_kontaktu': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'nie_zainteresowany': 'bg-red-500/20 text-red-400 border-red-500/30',
  'zdenerwowany': 'bg-red-600/20 text-red-300 border-red-600/30',
  'antysale': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'sale': 'bg-green-500/20 text-green-400 border-green-500/30',
  '$$': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'nowy': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const emptyClient = {
  id: '', first_name: '', last_name: '', company_name: '', nip: '',
  phone: '', email: '', notes: '', website: '', status: 'canvas' as const,
  edited_by: '', edited_at: '', owner_id: '', created_at: '', updated_at: '',
  reminder: { enabled: false, date: '', time: '', note: '' }
}

export function ClientsTableV2() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()
  
  // 🚀 PERFORMANCE: Debounced search prevents excessive API calls
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounced(searchQuery, 300)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('updated_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [newClient, setNewClient] = useState(emptyClient)
  
  // 🚀 PERFORMANCE: React Query hooks replace manual state management
  const filters = {
    search: debouncedSearchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    owner: ownerFilter === 'all' ? undefined : ownerFilter,
    location: locationFilter
  }
  
  // 🎯 CACHED DATA QUERIES - Shared across components, no duplicate API calls
  const { 
    data: paginatedData, 
    isLoading: isLoadingClients, 
    error: clientsError,
    refetch: refetchClients
  } = useClientsPaginated(currentPage, pageSize, filters)
  
  const { data: allUsers = [], isLoading: isLoadingUsers } = useUsers()
  const { data: owners = [], isLoading: isLoadingOwners } = useOwners()
  
  // 🎯 OPTIMIZED MUTATIONS - Auto-update cache
  const createClientMutation = useCreateClient()
  const updateClientMutation = useUpdateClient()
  const deleteClientMutation = useDeleteClient()
  const optimisticUpdate = useOptimisticClientUpdate()
  const prefetchClient = usePrefetchClient()
  
  // Extract data
  const clients = paginatedData?.clients || []
  const totalPages = paginatedData ? Math.ceil(paginatedData.total / pageSize) : 0
  const totalClients = paginatedData?.total || 0
  const isLoading = isLoadingClients || isLoadingUsers || isLoadingOwners
  
  // 🎯 EVENT HANDLERS - Optimized with React Query
  const handleSave = async () => {
    if (!editingClient) return
    try {
      await updateClientMutation.mutateAsync({
        clientId: editingClient.id,
        updates: editingClient
      })
      setIsEditDialogOpen(false)
      setEditingClient(null)
    } catch (error) {
      logger.error('Failed to update client', { error })
    }
  }
  
  const handleSaveNewClient = async () => {
    try {
      await createClientMutation.mutateAsync(newClient)
      setIsAddDialogOpen(false)
      setNewClient(emptyClient)
      setCurrentPage(1) // Reset to see new client
    } catch (error) {
      logger.error('Failed to create client', { error })
    }
  }
  
  const handleDelete = async (clientId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego klienta?')) return
    try {
      await deleteClientMutation.mutateAsync(clientId)
    } catch (error) {
      logger.error('Failed to delete client', { error })
    }
  }
  
  const handleEdit = (client: any) => {
    setEditingClient({ ...client })
    setIsEditDialogOpen(true)
  }
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }
  
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }
  
  // 🚀 PERFORMANCE: Prefetch on hover for better UX
  const handleClientHover = useCallback((clientId: string) => {
    prefetchClient(clientId)
  }, [prefetchClient])
  
  // Input handlers
  const handleInputChange = (field: string, value: string) => {
    if (!editingClient) return
    setEditingClient(prev => ({ ...prev, [field]: value }))
  }
  
  const handleNewClientInputChange = (field: string, value: string) => {
    setNewClient(prev => ({ ...prev, [field]: value }))
  }
  
  // Utilities
  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Nieprzypisany'
    const owner = owners.find(u => u.id === ownerId)
    return owner ? owner.full_name : 'Nieznany użytkownik'
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }
  
  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setOwnerFilter('all')
    setLocationFilter(null)
    setCurrentPage(1)
  }
  
  // Error state
  if (clientsError) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Błąd ładowania danych</h3>
            <p className="text-sm mb-4">Nie udało się załadować listy klientów</p>
            <Button onClick={() => refetchClients()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Spróbuj ponownie
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header with refresh and add buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Klienci (Optimized)</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Ładowanie...' : `${totalClients} klientów - React Query Cache Active 🚀`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetchClients()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież Cache
          </Button>
          <Button onClick={() => { setNewClient(emptyClient); setIsAddDialogOpen(true) }} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Dodaj klienta
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Filtry (Debounced Search 300ms)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Wyszukaj</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nazwa, firma, telefon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[status].split(' ')[0]}`} />
                        {status}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Właściciel</Label>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszyscy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszyscy</SelectItem>
                  <SelectItem value="unassigned">Nieprzypisani</SelectItem>
                  {owners.map(owner => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex items-end">
              <Button onClick={resetFilters} variant="outline" className="w-full">
                Resetuj filtry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Ładowanie z cache lub API...</span>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('company_name')}
                    >
                      <div className="flex items-center gap-2">
                        Firma {getSortIcon('company_name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('first_name')}
                    >
                      <div className="flex items-center gap-2">
                        Imię i nazwisko {getSortIcon('first_name')}
                      </div>
                    </TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Status {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead>Właściciel</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('updated_at')}
                    >
                      <div className="flex items-center gap-2">
                        Ostatnia edycja {getSortIcon('updated_at')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className="hover:bg-muted/50 transition-colors"
                      onMouseEnter={() => handleClientHover(client.id)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{client.company_name}</div>
                          {client.nip && (
                            <div className="text-sm text-muted-foreground">NIP: {client.nip}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{client.first_name} {client.last_name}</div>
                          {client.email && (
                            <div className="text-sm text-muted-foreground">{client.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3" />
                              {client.phone}
                            </div>
                          )}
                          {client.website && (
                            <div className="text-sm text-muted-foreground">{client.website}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[client.status]}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={client.owner?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getOwnerName(client.owner_id).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{getOwnerName(client.owner_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(client.updated_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edytuj (Cached)</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(client.id)}
                                  disabled={deleteClientMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Usuń</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Wyświetlanie {((currentPage - 1) * pageSize) + 1} do {Math.min(currentPage * pageSize, totalClients)} z {totalClients}
                  </span>
                  <Select value={pageSize.toString()} onValueChange={(newSize) => {
                    setPageSize(parseInt(newSize))
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="px-4 py-2 text-sm">
                    Strona {currentPage} z {totalPages}
                  </span>
                  
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>⚡ Edytuj klienta (Optimistic Updates)</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Imię</Label>
                  <Input
                    value={editingClient.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nazwisko</Label>
                  <Input
                    value={editingClient.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input
                  value={editingClient.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={editingClient.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingClient.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${statusColors[status].split(' ')[0]}`} />
                          {status}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Notatki</Label>
                <Textarea
                  value={editingClient.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleSave} disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Zapisz
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>➕ Dodaj klienta (Auto Cache Update)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Imię</Label>
                <Input
                  value={newClient.first_name}
                  onChange={(e) => handleNewClientInputChange('first_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nazwisko</Label>
                <Input
                  value={newClient.last_name}
                  onChange={(e) => handleNewClientInputChange('last_name', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Firma *</Label>
              <Input
                value={newClient.company_name}
                onChange={(e) => handleNewClientInputChange('company_name', e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={newClient.phone}
                  onChange={(e) => handleNewClientInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => handleNewClientInputChange('email', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newClient.status} onValueChange={(value) => handleNewClientInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[status].split(' ')[0]}`} />
                        {status}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Notatki</Label>
              <Textarea
                value={newClient.notes}
                onChange={(e) => handleNewClientInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Anuluj
              </Button>
              <Button 
                onClick={handleSaveNewClient}
                disabled={createClientMutation.isPending || !newClient.company_name}
              >
                {createClientMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Dodawanie...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 