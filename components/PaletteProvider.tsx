'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CICLO, CLAVE, OSCURAS, CLARAS, combinacionEn, type Combinacion } from '@/lib/paletas'

type Valor = Combinacion & { siguiente: () => void }

const CombinacionContext = createContext<Valor>({ ...combinacionEn(0), siguiente: () => {} })

/**
 * Los colores de marca activos y cómo avanzar.
 *
 * `a` lo usan la W, el logotipo del footer, los triángulos y el prompt; `b` está
 * reservado. `siguiente` lo disparan la W y el triángulo del header.
 */
export const useCombinacion = () => useContext(CombinacionContext)

/**
 * El color vive en `data-palette` sobre <html>, no en un wrapper, para que las
 * variables lleguen también a <body> — que es quien pinta el fondo. El valor es
 * el color A, que identifica la combinación de forma única.
 *
 * El paso se guarda en localStorage, así la próxima sesión sigue donde quedó.
 * La restauración va en un efecto y no en el estado inicial: leer localStorage
 * durante el render daría un HTML distinto del que vino del server y React se
 * quejaría de hidratación. El script de `layout.tsx` se ocupa de que los colores
 * ya estén bien antes del primer pintado.
 */
export default function PaletteProvider({ children }: { children: ReactNode }) {
  const [paso, setPaso] = useState(0)
  const [restaurado, setRestaurado] = useState(false)
  const combinacion = combinacionEn(paso)

  const siguiente = useCallback(() => {
    setPaso((n) => {
      // El módulo evita que el contador crezca sin techo en una sesión larga.
      const sig = (n + 1) % CICLO
      try {
        localStorage.setItem(CLAVE, String(sig))
      } catch {
        // Modo privado o storage lleno: el ciclo sigue, solo no se recuerda.
      }
      return sig
    })
  }, [])

  useEffect(() => {
    try {
      const guardado = Number(localStorage.getItem(CLAVE))
      if (Number.isInteger(guardado) && guardado >= 0) setPaso(guardado % CICLO)
    } catch {
      // Sin storage disponible se arranca en la primera combinación.
    }
    setRestaurado(true)
  }, [])

  // No pintar hasta restaurar el color guardado: montar con el default y setear
  // `data-palette` acá pisaría el valor que SCRIPT_PALETA ya aplicó pre-pintado
  // y el fondo haría default→guardado con la transición de 0.3s — el parpadeo.
  useEffect(() => {
    if (restaurado) document.documentElement.dataset.palette = combinacion.a
  }, [combinacion.a, restaurado])

  // Precarga: sin esto, la primera vez que aparece cada color el logo parpadea.
  useEffect(() => {
    for (const { a, b } of [...OSCURAS, ...CLARAS]) {
      for (const [base, color] of [
        ['w', a],
        ['lawal', a],
        ['lawal', b],
      ] as const) {
        const img = new Image()
        img.src = `/${base}-${color}.png`
      }
    }
  }, [])

  return (
    <CombinacionContext.Provider value={{ ...combinacion, siguiente }}>
      {children}
    </CombinacionContext.Provider>
  )
}
