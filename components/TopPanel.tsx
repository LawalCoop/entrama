import type { ReactNode } from 'react'
import styles from './TopPanel.module.css'

/**
 * La barra superior: solo la caja.
 *
 * Su contenido llega por la ruta paralela `@encabezado`, así que este elemento
 * se monta una vez en toda la sesión y nunca se desmonta — lo que cambia al
 * navegar es lo que tiene adentro, no él.
 */
export default function TopPanel({ children }: { children: ReactNode }) {
  return <header className={styles.panel}>{children}</header>
}
