'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Marca = 'amarillo' | 'gris' | 'verde' | 'rojo' | 'morado' | 'violeta' | 'oscuro'

/** Una combinación reparte dos colores de marca entre las categorías 6 y 7. */
export type Combinacion = { a: Marca; b: Marca }

/**
 * Dos listas que avanzan por separado, y cada avance salta de una a la otra, así
 * la alternancia oscuro/claro no se rompe nunca — ni al cerrar el círculo.
 *
 * A y B salen siempre del grupo legible sobre ese fondo: sobre oscuro
 * amarillo/gris/rojo/verde, sobre claro morado/violeta/oscuro.
 *
 * Como 4 y 3 son coprimos, el ciclo completo son 24 pasos.
 */
const OSCURAS: readonly Combinacion[] = [
  { a: 'amarillo', b: 'gris' },
  { a: 'verde', b: 'amarillo' },
  { a: 'rojo', b: 'gris' },
  { a: 'gris', b: 'verde' },
]

const CLARAS: readonly Combinacion[] = [
  { a: 'violeta', b: 'morado' },
  { a: 'morado', b: 'oscuro' },
  { a: 'oscuro', b: 'violeta' },
]

const CICLO = 2 * OSCURAS.length * CLARAS.length

/** Pares avanzan una lista; impares la otra. Cada lista rota a su propio ritmo. */
function combinacionEn(paso: number): Combinacion {
  const vuelta = Math.floor(paso / 2)
  return paso % 2 === 0 ? OSCURAS[vuelta % OSCURAS.length] : CLARAS[vuelta % CLARAS.length]
}

type Valor = Combinacion & { siguiente: () => void }

const CombinacionContext = createContext<Valor>({ ...combinacionEn(0), siguiente: () => {} })

/**
 * Los colores de marca activos y cómo avanzar.
 *
 * `a` lo usan la W, el logotipo del footer y el ícono de Recolectar; `b`, el
 * ícono de Presentar. `siguiente` lo dispara solo la W.
 */
export const useCombinacion = () => useContext(CombinacionContext)

/**
 * El color vive en `data-palette` sobre <html>, no en un wrapper, para que las
 * variables lleguen también a <body> — que es quien pinta el fondo. El valor es
 * el color A, que identifica la combinación de forma única.
 */
export default function PaletteProvider({ children }: { children: ReactNode }) {
  const [paso, setPaso] = useState(0)
  const combinacion = combinacionEn(paso)

  // El módulo evita que el contador crezca sin techo en una sesión larga.
  const siguiente = useCallback(() => setPaso((n) => (n + 1) % CICLO), [])

  useEffect(() => {
    document.documentElement.dataset.palette = combinacion.a
  }, [combinacion.a])

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
