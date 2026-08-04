import type { ReactNode } from 'react'
import FooterLogo from './FooterLogo'
import TopPanel from './TopPanel'
import styles from './AppLayout.module.css'

type Props = {
  /** La portada muestra la W; las demás, el triángulo de su sección. */
  home?: boolean
  /** Nombre de la pantalla, tal como aparece en el prompt del header. */
  titulo: string
  icon?: ReactNode
  children: ReactNode
}

export default function AppLayout({ home, titulo, icon, children }: Props) {
  return (
    <div className={styles.shell}>
      <TopPanel home={home} titulo={titulo} icon={icon} />
      <main className={styles.content}>{children}</main>
      <footer className={styles.footer}>
        <FooterLogo />
      </footer>
    </div>
  )
}
