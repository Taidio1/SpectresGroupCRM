import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Spectres Group
          </h1>
          <p className="text-slate-400">
            System zarządzania klientami
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
} 