import { Reports } from "@/components/reports"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function DetailsReportsPage() {
  return (
    <ProtectedLayout title="Raport - Szczegóły" subtitle="Szczegółowe statystyki poszczególnych pracowników">
      <Reports />
    </ProtectedLayout>
  )
} 