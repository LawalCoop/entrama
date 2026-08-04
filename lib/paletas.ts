export type Marca = 'amarillo' | 'gris' | 'verde' | 'rojo' | 'morado' | 'violeta' | 'oscuro'

/** Una combinación reparte dos colores de marca entre las categorías 6 y 7. */
export type Combinacion = { a: Marca; b: Marca }

/**
 * Dos listas que avanzan por separado, y cada paso salta de una a la otra, así
 * la alternancia oscuro/claro no se rompe nunca — ni al cerrar el círculo.
 *
 * A y B salen siempre del grupo legible sobre ese fondo: sobre oscuro
 * amarillo/gris/rojo/verde, sobre claro morado/violeta/oscuro.
 *
 * Como 4 y 3 son coprimos, el ciclo completo son 24 pasos.
 */
export const OSCURAS: readonly Combinacion[] = [
  { a: 'amarillo', b: 'gris' },
  { a: 'verde', b: 'amarillo' },
  { a: 'rojo', b: 'gris' },
  { a: 'gris', b: 'verde' },
]

export const CLARAS: readonly Combinacion[] = [
  { a: 'violeta', b: 'morado' },
  { a: 'morado', b: 'oscuro' },
  { a: 'oscuro', b: 'violeta' },
]

export const CICLO = 2 * OSCURAS.length * CLARAS.length

/** Dónde se guarda el paso entre sesiones. */
export const CLAVE = 'entrama:paleta'

/** Pares avanzan una lista; impares la otra. Cada lista rota a su propio ritmo. */
export function combinacionEn(paso: number): Combinacion {
  const vuelta = Math.floor(paso / 2)
  return paso % 2 === 0 ? OSCURAS[vuelta % OSCURAS.length] : CLARAS[vuelta % CLARAS.length]
}

/**
 * Color A de cada paso del ciclo, precalculado.
 *
 * Lo usa el script que corre antes del primer pintado: con esta tabla solo tiene
 * que indexar, sin repetir la lógica de las dos listas en un string.
 */
export const SECUENCIA: readonly Marca[] = Array.from(
  { length: CICLO },
  (_, i) => combinacionEn(i).a,
)
