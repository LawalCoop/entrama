import styles from './FooterLogo.module.css'

/**
 * El logotipo Lawal del footer. Usa el Color A, el mismo que la W.
 *
 * Se pinta por CSS: `--marca-lawal` se define por paleta en globals.css y ya
 * vale el color guardado antes del primer pintado, así el logo no parpadea
 * default→guardado como haría si el src dependiera del estado de React.
 *
 * `aspect-ratio` reproduce la proporción intrínseca del PNG (recortado al
 * contenido) — el mismo hint que daban width/height — y evita el salto de
 * layout.
 */
export default function FooterLogo() {
  return <div className={styles.footerLogo} role="img" aria-label="Lawal" />
}
