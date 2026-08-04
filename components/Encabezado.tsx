import type { ReactNode } from 'react'
import Link from 'next/link'
import { Prompt } from '@/app/icons'
import BotonPaleta from './BotonPaleta'
import WLogo from './WLogo'
import styles from './TopPanel.module.css'

type Props = {
  /** Nombre de la pantalla. El triángulo de prompt lo agrega este componente. */
  titulo: string
  /** La portada: muestra la W y no antepone la vuelta a la raíz. */
  home?: boolean
  /** Triángulo de la sección. En la portada su lugar lo ocupa la W. */
  icon?: ReactNode
}

/**
 * Las dos mitades del header: la ruta a la izquierda, la marca a la derecha.
 *
 * Devuelve un fragmento y no un contenedor: `.panel` reparte a sus hijos con
 * `space-between`, así que meter un div acá rompería esa distribución.
 *
 * Cada sección lo renderiza desde su propio page dentro de `@encabezado`, así
 * el título vive al lado de la pantalla que nombra y no en un mapa central.
 */
export default function Encabezado({ titulo, home = false, icon }: Props) {
  return (
    <>
      <nav className={styles.linea} aria-label="Ruta">
        {/* La raíz solo aparece adentro, y es la vuelta a la portada. */}
        {!home && (
          <>
            <Link href="/" className={styles.raiz}>
              Entrama
            </Link>
            <Prompt className={styles.prompt} />
          </>
        )}

        <span className={styles.titulo} aria-current="page">
          {titulo}
        </span>
        <Prompt className={styles.prompt} />
      </nav>

      {/* La W y el triángulo hacen lo mismo: avanzar la paleta. */}
      <div className={styles.trailing}>
        <BotonPaleta>{home ? <WLogo /> : icon}</BotonPaleta>
      </div>
    </>
  )
}
