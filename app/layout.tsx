import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Space_Grotesk, Inter } from 'next/font/google'
import FooterLogo from '@/components/FooterLogo'
import PantallaCompleta from '@/components/PantallaCompleta'
import PaletteProvider from '@/components/PaletteProvider'
import TopPanel from '@/components/TopPanel'
import { CICLO, CLAVE, SECUENCIA } from '@/lib/paletas'
import styles from './layout.module.css'
import './globals.css'

/**
 * Aplica la paleta guardada antes del primer pintado.
 *
 * Sin esto la página aparece un instante con la combinación por defecto y salta
 * a la guardada cuando React hidrata: el clásico parpadeo de tema. Las rutas son
 * estáticas y se sirven desde el CDN, así que el server no puede saber qué
 * paleta eligió este visitante — el único momento posible es acá, sincrónico y
 * antes de que el browser pinte.
 *
 * Indexa una tabla precalculada en vez de repetir la lógica de las dos listas.
 */
const SCRIPT_PALETA = `try{var p=parseInt(localStorage.getItem(${JSON.stringify(CLAVE)}),10);if(p>=0)document.documentElement.dataset.palette=${JSON.stringify(SECUENCIA)}[p%${CICLO}]}catch(e){}`

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Entrama',
  description: 'Recolectá y presentá',
}

/**
 * El armazón de la app: header, contenido y footer.
 *
 * `encabezado` es una ruta paralela (`app/@encabezado`), así que el contenido de
 * la barra superior lo decide la ruta igual que el contenido central, pero por
 * su cuenta. Gracias a eso el header y el footer se montan una sola vez en toda
 * la sesión: al navegar cambia lo que hay adentro de cada slot, no el armazón.
 *
 * Es lo mismo que ya hacía `PaletteProvider` — por eso la paleta sobrevive a la
 * navegación — extendido ahora a toda la estructura visible.
 */
export default function RootLayout({
  children,
  encabezado,
}: {
  children: ReactNode
  encabezado: ReactNode
}) {
  return (
    // suppressHydrationWarning por `data-palette`: SCRIPT_PALETA lo escribe
    // antes de hidratar, así que el atributo del cliente no coincide con el del
    // server —y no puede coincidir, porque el HTML es estático y no sabe qué
    // paleta eligió este visitante. La supresión vale solo para los atributos
    // de este elemento, no para su contenido.
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PALETA }} />
        <PaletteProvider>
          <div className={styles.shell}>
            <TopPanel>{encabezado}</TopPanel>
            <main className={styles.content}>{children}</main>
            <footer className={styles.footer}>
              <FooterLogo />
              <PantallaCompleta />
            </footer>
          </div>
        </PaletteProvider>
      </body>
    </html>
  )
}
