'use client'

import { useCombinacion } from './PaletteProvider'
import styles from './FooterLogo.module.css'

/**
 * El logotipo Lawal del footer. Usa el Color A, el mismo que la W.
 *
 * Medidas intrínsecas del PNG recortado al contenido: son el hint de proporción
 * para el browser, no el tamaño en pantalla, que lo fija el CSS.
 */
const ANCHO = 606
const ALTO = 126

export default function FooterLogo() {
  const { a } = useCombinacion()

  return (
    <img
      src={`/lawal-${a}.png`}
      alt="Lawal"
      width={ANCHO}
      height={ALTO}
      className={styles.footerLogo}
      draggable={false}
    />
  )
}
