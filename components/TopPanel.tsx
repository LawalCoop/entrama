import type { ReactNode } from 'react'
import Link from 'next/link'
import { Prompt } from '@/app/icons'
import WLogo from './WLogo'
import styles from './TopPanel.module.css'

type Props = {
  /** La portada muestra la W; las demás, el triángulo de su sección. */
  home?: boolean
  /** Nombre de la pantalla. El triángulo de prompt lo agrega el panel. */
  titulo: string
  icon?: ReactNode
}

export default function TopPanel({ home = false, titulo, icon }: Props) {
  return (
    <header className={styles.panel}>
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

      <div className={styles.trailing}>{home ? <WLogo /> : icon}</div>
    </header>
  )
}
