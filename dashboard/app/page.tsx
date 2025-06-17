import { Dashboard } from "@/components/dashboard"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function Page() {
  return (
    <ProtectedLayout>
      <Dashboard />
    </ProtectedLayout>
  )
}
