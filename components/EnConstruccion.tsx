import Octaedro from './Octaedro'
import styles from './EnConstruccion.module.css'

/**
 * Placeholder de las caras que todavía no existen.
 *
 * El octaedro son ocho triángulos de la marca girando, recorriendo los colores
 * que se leen sobre el fondo activo.
 */
export default function EnConstruccion() {
  return (
    <div className={styles.card}>
      <Octaedro />
      <p className={styles.texto}>En construcción</p>
    </div>
  )
}
