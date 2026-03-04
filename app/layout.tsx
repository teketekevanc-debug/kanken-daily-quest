import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// ★ ここがブラウザのタブに表示されるタイトルと説明文になります！
export const metadata: Metadata = {
  title: '毎日漢検クエスト',
  description: 'Rickと一緒に毎日漢字の特訓をしよう！',
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