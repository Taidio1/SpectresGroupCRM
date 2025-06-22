import { MyStatsPage } from "@/components/my-stats"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function MyStats() {
  return (
    <ProtectedLayout title="Moje statystyki" subtitle="Twoje dane i osiągnięcia">
      <MyStatsPage />
    </ProtectedLayout>
  )
} 