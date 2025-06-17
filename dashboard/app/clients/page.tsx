'use client'

import { ClientsTable } from "@/components/clients-table"
import { ProtectedLayout } from "@/components/auth/protected-layout"
import { useLanguage } from "@/lib/language-context"

export default function ClientsPage() {
  const { t } = useLanguage()
  
  return (
    <ProtectedLayout title={t('clients.title')} subtitle={t('clients.title')}>
      <ClientsTable />
    </ProtectedLayout>
  )
} 