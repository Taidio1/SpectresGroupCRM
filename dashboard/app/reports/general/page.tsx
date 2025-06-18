import { GeneralReports } from "@/components/general-reports"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function GeneralReportsPage() {
  return (
    <ProtectedLayout title="Raport - Ogólne" subtitle="Ogólne statystyki wszystkich pracowników">
      <GeneralReports />
    </ProtectedLayout>
  )
} 