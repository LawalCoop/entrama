import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Space_Grotesk, Inter } from 'next/font/google'
import PaletteProvider from '@/components/PaletteProvider'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Entrama',
  description: 'Recolectá y presentá',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>
        <PaletteProvider>{children}</PaletteProvider>
      </body>
    </html>
  )
}
