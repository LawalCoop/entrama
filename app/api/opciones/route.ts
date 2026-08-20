import { listarOpciones, PROVINCIAS } from '@/lib/opciones'

/**
 * Las listas del paso 1 de /recolectar.
 *
 * Público y de solo lectura: son catálogos, no datos de nadie, y el formulario
 * que los consume también es público.
 *
 * Si la base falla devuelve las provincias igual y los catálogos vacíos, con un
 * 200. Los tres campos son opcionales, así que sin ellos el wizard funciona
 * completo: romperlo porque no se pudo listar sería cambiar una molestia por un
 * problema.
 */
export async function GET() {
  try {
    return Response.json(await listarOpciones())
  } catch (err) {
    console.error('GET /api/opciones:', err)
    return Response.json({ provincias: PROVINCIAS, tipos: [], actividades: [] })
  }
}
