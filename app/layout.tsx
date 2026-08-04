import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DM_Serif_Display, Inter } from 'next/font/google'
import './globals.css'

const dmSerif = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-dm-serif' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Entrama',
  description: 'Recolectá y presentá',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${dmSerif.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
