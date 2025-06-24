import { CallsTable } from "@/components/calls-table"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function CallsPage() {
  return (
    <ProtectedLayout 
      title="Historia połączeń" 
      subtitle="Przegląd połączeń telefonicznych"
    >
      <CallsTable />
    </ProtectedLayout>
  )
} 