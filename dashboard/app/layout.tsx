import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { EnhancedAuthProvider } from "@/components/auth/enhanced-auth-provider"
import { LanguageProvider } from "@/lib/language-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Spectres Group",
  description: "System zarządzania klientami Spectres Group",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <EnhancedAuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </EnhancedAuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
