import { Reports } from "@/components/reports"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function ReportsPage() {
  return (
    <ProtectedLayout title="Raporty i analityki" subtitle="Statystyki sprzedaży i aktywności pracowników">
      <Reports />
    </ProtectedLayout>
  )
} 