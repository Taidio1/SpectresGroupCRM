'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Phone, Mail, Building2, FileText, Calendar, User, X } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface Client {
  id: string
  first_name: string
  last_name: string
  company_name: string
  nip: string
  phone: string
  email: string
  notes: string
  website: string
  status: string
  owner?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  updated_at: string
  created_at: string
}

interface ClientDetailsPopupProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
}

export function ClientDetailsPopup({ client, isOpen, onClose }: ClientDetailsPopupProps) {
  const { t } = useLanguage()

  if (!client) return null

  // Kolory statusów
  const statusColors = {
    'canvas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'brak_kontaktu': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'nie_zainteresowany': 'bg-red-500/20 text-red-400 border-red-500/30',
    'zdenerwowany': 'bg-red-600/20 text-red-300 border-red-600/30',
    'antysale': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'sale': 'bg-green-500/20 text-green-400 border-green-500/30',
    '$$': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pl-PL'),
      time: date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const lastUpdate = formatDate(client.updated_at)
  const created = formatDate(client.created_at)

  const handlePhoneClick = (phone: string) => {
    window.open(`tel:${phone}`, '_self')
  }

  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`, '_self')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={client.owner?.avatar_url || '/placeholder-user.jpg'} 
                  alt={`${client.first_name} ${client.last_name}`}
                  className="object-cover"
                />
                <AvatarFallback className="bg-slate-700 text-slate-300">
                  {`${client.first_name[0]}${client.last_name[0]}`.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-semibold">
                  {client.first_name} {client.last_name}
                </div>
                <div className="text-sm text-slate-400 font-normal">
                  {client.company_name}
                </div>
              </div>
            </div>
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status i podstawowe info */}
          <div className="flex items-center justify-between">
            <Badge 
              className={statusColors[client.status as keyof typeof statusColors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}
            >
              {t(`clients.statuses.${client.status}`) || client.status}
            </Badge>
            <div className="text-sm text-slate-400">
              <Calendar className="h-4 w-4 inline mr-1" />
              Ostatnia edycja: {lastUpdate.date} o {lastUpdate.time}
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Informacje kontaktowe */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Informacje kontaktowe
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Telefon</div>
                    <button
                      onClick={() => handlePhoneClick(client.phone)}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                    >
                      {client.phone}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Email</div>
                    <button
                      onClick={() => handleEmailClick(client.email)}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                    >
                      {client.email}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Firma</div>
                    <div className="text-white">{client.company_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">NIP</div>
                    <div className="text-white">{client.nip}</div>
                  </div>
                </div>
              </div>
            </div>

            {client.website && (
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 text-slate-400">🌐</div>
                <div>
                  <div className="text-sm text-slate-400">Strona WWW</div>
                  <a
                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    {client.website}
                  </a>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Właściciel */}
          {client.owner && (
            <>
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Właściciel klienta
                </h3>
                
                <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={client.owner.avatar_url || '/placeholder-user.jpg'} 
                      alt={client.owner.full_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-slate-600 text-slate-300">
                      {client.owner.full_name
                        .split(' ')
                        .map(name => name[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-medium">{client.owner.full_name}</div>
                    <div className="text-sm text-slate-400">{client.owner.email}</div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-700" />
            </>
          )}

          {/* Notatka */}
          {client.notes && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notatka
              </h3>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-300 whitespace-pre-wrap">{client.notes}</p>
              </div>
            </div>
          )}

          {/* Daty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Utworzono</div>
              <div className="text-white">
                {created.date} o {created.time}
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Ostatnia edycja</div>
              <div className="text-white">
                {lastUpdate.date} o {lastUpdate.time}
              </div>
            </div>
          </div>
        </div>

        {/* Akcje */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
          <div className="flex gap-2">
            <Button
              onClick={() => handlePhoneClick(client.phone)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone className="h-4 w-4 mr-2" />
              Zadzwoń
            </Button>
            <Button
              onClick={() => handleEmailClick(client.email)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 