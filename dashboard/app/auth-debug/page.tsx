import { ProtectedLayout } from "@/components/auth/protected-layout"
import { AuthDebugPanel } from "@/components/auth/auth-debug-panel"

export default function AuthDebugPage() {
  return (
    <ProtectedLayout
      title="Debug Autoryzacji"
      subtitle="Panel diagnostyczny dla deweloperów i administratorów"
    >
      <div className="space-y-6">
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
          <h3 className="text-orange-400 font-medium mb-2">⚠️ Strona Deweloperska</h3>
          <p className="text-orange-300 text-sm">
            Ta strona jest przeznaczona do debugowania problemów z autoryzacją. 
            Zawiera szczegółowe logi błędów i informacje o sesji użytkownika.
          </p>
        </div>
        
        <AuthDebugPanel />
      </div>
    </ProtectedLayout>
  )
} 