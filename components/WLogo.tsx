'use client'

import { useCombinacion } from './PaletteProvider'
import styles from './WLogo.module.css'

/**
 * La W del header. Usa el Color A y cambia de archivo con la combinación.
 *
 * Es además el único disparador del cambio de paleta, así que va dentro de un
 * <button> de verdad: se activa con teclado, se anuncia como control y toma
 * foco. Un onClick sobre el <img> no daría nada de eso.
 *
 * A diferencia del logotipo del footer, la W NO va recortada al contenido: la
 * marca necesita su aire para leerse, y sin él se deforma. Por eso el PNG es
 * cuadrado. Las medidas son las intrínsecas del archivo — no fijan el tamaño en
 * pantalla, que lo pone el CSS, pero le dan al browser la proporción antes de
 * que la imagen cargue y evitan el salto de layout.
 */
const ANCHO = 500
const ALTO = 500

export default function WLogo() {
  const { a, siguiente } = useCombinacion()

  return (
    <button type="button" onClick={siguiente} className={styles.boton} aria-label="Cambiar la paleta de colores">
      <img
        src={`/w-${a}.png`}
        alt=""
        width={ANCHO}
        height={ALTO}
        className={styles.w}
        draggable={false}
      />
    </button>
  )
}
