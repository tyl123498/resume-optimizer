import type { Metadata } from "next"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"

export const metadata: Metadata = {
  title: "AI Resume Optimizer",
  description: "Optimize your resume with AI-powered analysis and generation",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
