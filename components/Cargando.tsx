import Octaedro from './Octaedro'
import styles from './Cargando.module.css'

/**
 * Estado de carga: el octaedro girando y el rótulo.
 *
 * Lo usan los `loading.tsx` de cada sección y también las páginas que todavía
 * no tienen contenido, así el placeholder y la carga real son lo mismo.
 *
 * `role="status"` con `aria-live="polite"` hace que un lector de pantalla
 * anuncie el cambio cuando aparece, sin robarle el foco a nadie.
 */
export default function Cargando() {
  return (
    <div className={styles.card} role="status" aria-live="polite">
      <Octaedro />
      <p className={styles.texto}>Cargando</p>
    </div>
  )
}
