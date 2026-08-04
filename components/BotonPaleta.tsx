'use client'

import type { ReactNode } from 'react'
import { useCombinacion } from './PaletteProvider'
import styles from './BotonPaleta.module.css'

/**
 * La caja accesible alrededor de la marca del header.
 *
 * Envuelve tanto a la W de la portada como al triángulo de cada sección, así los
 * dos avanzan la paleta y se comportan igual.
 *
 * Es un <button> de verdad y no un onClick sobre la imagen: se activa con Enter
 * y Espacio, se anuncia como control a un lector de pantalla y entra en el orden
 * de tabulación. Nada de eso lo da un handler sobre un <img>.
 */
export default function BotonPaleta({ children }: { children: ReactNode }) {
  const { siguiente } = useCombinacion()

  return (
    <button
      type="button"
      onClick={siguiente}
      className={styles.boton}
      aria-label="Cambiar la paleta de colores"
    >
      {children}
    </button>
  )
}
