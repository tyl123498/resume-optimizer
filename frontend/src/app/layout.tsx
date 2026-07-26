import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI简历优化专家 | 9.9元智能优化简历",
  description: "上传简历+粘贴职位描述，AI自动分析匹配度并生成优化简历。仅需9.9元/次。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
