import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '毎日受験クエスト',
  description: 'Rickと一緒に毎日受験漢字を特訓しよう！',
  icons: {
    icon: '/Rick.png',
    apple: '/Rick.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}