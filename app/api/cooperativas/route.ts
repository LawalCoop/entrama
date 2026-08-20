import { listar } from '@/lib/cooperativas'

/**
 * Los nombres del catálogo, para el autocompletado de /recolectar.
 *
 * Público y de solo lectura: son nombres de cooperativas, no datos de nadie, y
 * el formulario que los consume también es público.
 *
 * Si la base falla devuelve una lista vacía y un 200, no un 500. El
 * autocompletado es una ayuda: sin sugerencias el campo sigue siendo un input
 * de texto que funciona igual. Romper el paso 1 del wizard porque no se pudo
 * sugerir sería cambiar una molestia por un problema.
 */
export async function GET() {
  try {
    return Response.json({ cooperativas: await listar() })
  } catch (err) {
    console.error('GET /api/cooperativas:', err)
    return Response.json({ cooperativas: [] })
  }
}
