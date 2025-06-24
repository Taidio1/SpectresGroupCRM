"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { 
  Search, Edit, Trash2, Save, X, Eye, Plus, Upload, FileSpreadsheet, 
  RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Building2, Phone, Clock, AlertCircle,
  History, User
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"

// 🚀 PERFORMANCE: Import optimized hooks instead of direct API calls
import { 
  useClients, 
  useClientsPaginated, 
  useClient, 
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
import { LazyClientDetailsPopupWrapper } from "@/components/LazyComponents"

// Statusy zgodnie z README
const statusOptions = [
  'canvas',
  'brak_kontaktu', 
  'nie_zainteresowany',
  'zdenerwowany',
  'antysale',
  'sale',
  '$$',
] as const

const statusColors = {
  'canvas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'brak_kontaktu': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'nie_zainteresowany': 'bg-red-500/20 text-red-400 border-red-500/30',
  'zdenerwowany': 'bg-red-600/20 text-red-300 border-red-600/30',
  'antysale': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'sale': 'bg-green-500/20 text-green-400 border-green-500/30',
  '$$': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

// Pusty template dla nowego klienta
const emptyClient = {
  id: '',
  first_name: '',
  last_name: '',
  company_name: '',
  nip: '',
  phone: '',
  email: '',
  notes: '',
  website: '',
  status: 'canvas' as const,
  edited_by: '',
  edited_at: '',
  owner_id: '',
  created_at: '',
  updated_at: '',
  reminder: {
    enabled: false,
    date: '',
    time: '',
    note: ''
  }
}

export function ClientsTableOptimized() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()
  
  // 🚀 PERFORMANCE: Debounced search to prevent excessive API calls
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
  
  // Details popup state
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<any>(null)
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false)
  
  // 🚀 PERFORMANCE: Use React Query hooks instead of manual state management
  const filters = {
    search: debouncedSearchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    owner: ownerFilter === 'all' ? undefined : ownerFilter,
    location: locationFilter
  }
  
  // 🎯 MAIN DATA QUERIES - Cached and shared across components
  const { 
    data: paginatedData, 
    isLoading: isLoadingClients, 
    error: clientsError,
    refetch: refetchClients
  } = useClientsPaginated(currentPage, pageSize, filters)
  
  const { 
    data: allUsers = [], 
    isLoading: isLoadingUsers 
  } = useUsers()
  
  const { 
    data: owners = [], 
    isLoading: isLoadingOwners 
  } = useOwners()
  
  // 🎯 MUTATIONS - Optimized with cache updates
  const createClientMutation = useCreateClient()
  const updateClientMutation = useUpdateClient()
  const deleteClientMutation = useDeleteClient()
  
  // 🎯 OPTIMISTIC UPDATES - For real-time feel
  const optimisticUpdate = useOptimisticClientUpdate()
  const prefetchClient = usePrefetchClient()
  
  // Extract clients and pagination info
  const clients = paginatedData?.clients || []
  const totalPages = paginatedData ? Math.ceil(paginatedData.total / pageSize) : 0
  const totalClients = paginatedData?.total || 0
  
  // 🚀 PERFORMANCE: Loading states with better UX
  const isLoading = isLoadingClients || isLoadingUsers || isLoadingOwners
  const hasError = clientsError
  
  // 🎯 HANDLERS - Optimized with React Query
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
      // Optionally reset to first page to see new client
      setCurrentPage(1)
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
  
  const handleAddClient = () => {
    setNewClient(emptyClient)
    setIsAddDialogOpen(true)
  }
  
  // 🎯 SORT HANDLERS
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }
  
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4" /> 
      : <ArrowDown className="w-4 h-4" />
  }
  
  // 🎯 PAGINATION HANDLERS
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize))
    setCurrentPage(1)
  }
  
  // 🎯 FILTER RESET
  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setOwnerFilter('all')
    setLocationFilter(null)
    setCurrentPage(1)
  }
  
  // 🎯 DETAILS POPUP HANDLERS
  const handleShowDetails = (client: any) => {
    setSelectedClientForDetails(client)
    setIsDetailsPopupOpen(true)
  }
  
  const handleCloseDetailsPopup = () => {
    setIsDetailsPopupOpen(false)
    setSelectedClientForDetails(null)
  }
  
  // 🚀 PERFORMANCE: Prefetch on hover for better UX
  const handleClientHover = useCallback((clientId: string) => {
    prefetchClient(clientId)
  }, [prefetchClient])
  
  // 🎯 INPUT HANDLERS
  const handleInputChange = (field: string, value: string) => {
    if (!editingClient) return
    setEditingClient(prev => ({ ...prev, [field]: value }))
  }
  
  const handleNewClientInputChange = (field: string, value: string) => {
    setNewClient(prev => ({ ...prev, [field]: value }))
  }
  
  const handleReminderChange = (field: string, value: string | boolean) => {
    if (!editingClient) return
    setEditingClient(prev => ({
      ...prev,
      reminder: { ...prev.reminder, [field]: value }
    }))
  }
  
  const handleNewClientReminderChange = (field: string, value: string | boolean) => {
    setNewClient(prev => ({
      ...prev,
      reminder: { ...prev.reminder, [field]: value }
    }))
  }
  
  // 🎯 UTILITIES
  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Nieprzypisany'
    const owner = owners.find(u => u.id === ownerId)
    return owner ? owner.full_name : 'Nieznany użytkownik'
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // 🎯 RENDER
  if (hasError) {
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
      {/* 🎯 HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Klienci</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Ładowanie...' : `${totalClients} klientów`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetchClients()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież
          </Button>
          <Button onClick={handleAddClient} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Dodaj klienta
          </Button>
        </div>
      </div>
      
      {/* 🎯 FILTERS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Wyszukaj</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nazwa, firma, telefon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
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
              <Label htmlFor="owner">Właściciel</Label>
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
      
      {/* 🎯 TABLE */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Ładowanie klientów...</span>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('company_name')}
                  >
                    <div className="flex items-center gap-2">
                      Firma
                      {getSortIcon('company_name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('first_name')}
                  >
                    <div className="flex items-center gap-2">
                      Imię i nazwisko
                      {getSortIcon('first_name')}
                    </div>
                  </TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead>Właściciel</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('updated_at')}
                  >
                    <div className="flex items-center gap-2">
                      Ostatnia edycja
                      {getSortIcon('updated_at')}
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
                          <div className="text-sm text-muted-foreground">
                            NIP: {client.nip}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{client.first_name} {client.last_name}</div>
                        {client.email && (
                          <div className="text-sm text-muted-foreground">
                            {client.email}
                          </div>
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
                          <div className="text-sm text-muted-foreground">
                            {client.website}
                          </div>
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
                        <span className="text-sm">
                          {getOwnerName(client.owner_id)}
                        </span>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowDetails(client)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Szczegóły</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(client)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edytuj</TooltipContent>
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
          )}
          
          {/* 🎯 PAGINATION */}
          {!isLoading && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Wyświetlanie {((currentPage - 1) * pageSize) + 1} do {Math.min(currentPage * pageSize, totalClients)} z {totalClients}
                </span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
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
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="px-4 py-2 text-sm">
                  Strona {currentPage} z {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 🎯 EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj klienta</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first-name">Imię</Label>
                  <Input
                    id="edit-first-name"
                    value={editingClient.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-name">Nazwisko</Label>
                  <Input
                    id="edit-last-name"
                    value={editingClient.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-company">Firma</Label>
                <Input
                  id="edit-company"
                  value={editingClient.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefon</Label>
                  <Input
                    id="edit-phone"
                    value={editingClient.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
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
                <Label htmlFor="edit-notes">Notatki</Label>
                <Textarea
                  id="edit-notes"
                  value={editingClient.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updateClientMutation.isPending}
                >
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
      
      {/* 🎯 ADD DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj nowego klienta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-first-name">Imię</Label>
                <Input
                  id="new-first-name"
                  value={newClient.first_name}
                  onChange={(e) => handleNewClientInputChange('first_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-last-name">Nazwisko</Label>
                <Input
                  id="new-last-name"
                  value={newClient.last_name}
                  onChange={(e) => handleNewClientInputChange('last_name', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-company">Firma *</Label>
              <Input
                id="new-company"
                value={newClient.company_name}
                onChange={(e) => handleNewClientInputChange('company_name', e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-phone">Telefon</Label>
                <Input
                  id="new-phone"
                  value={newClient.phone}
                  onChange={(e) => handleNewClientInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => handleNewClientInputChange('email', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-status">Status</Label>
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
              <Label htmlFor="new-notes">Notatki</Label>
              <Textarea
                id="new-notes"
                value={newClient.notes}
                onChange={(e) => handleNewClientInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
              >
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
      
      {/* 🎯 DETAILS POPUP */}
      {isDetailsPopupOpen && selectedClientForDetails && (
        <LazyClientDetailsPopupWrapper
          client={selectedClientForDetails}
          isOpen={isDetailsPopupOpen}
          onClose={handleCloseDetailsPopup}
          onUpdate={(updatedClient) => {
            // Optimistic update for immediate UI response
            optimisticUpdate(updatedClient.id, updatedClient)
            handleCloseDetailsPopup()
          }}
        />
      )}
    </div>
  )
} 