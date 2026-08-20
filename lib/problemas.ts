import { withClient } from './db'

/**
 * Lectura de los problemas recolectados, para el panel de /admin.
 *
 * Vive separado del route handler que los escribe porque son dos usos con
 * formas distintas: aquel valida un envío suelto, este pagina un listado. Lo
 * único que comparten es la tabla.
 */

export const POR_PAGINA = 20

export type Problema = {
  id: string
  creadoEn: Date
  nombre: string
  cooperativa: string
  /** Se dejó de preguntar en el wizard; las filas viejas la tienen. */
  area: string | null
  problema: string
  frecuencia: string
  impacto: string
  /** Perfil: opcional en el wizard, así que puede venir vacío. */
  provincia: string | null
  tipoOrganizacion: string | null
  actividades: string[]
  deviceId: string | null
}

export type Pagina = {
  filas: Problema[]
  /** Cuántos hay en total, no cuántos trae esta página. */
  total: number
  /** La página que se terminó sirviendo, que puede no ser la pedida. */
  pagina: number
  paginas: number
}

const COLUMNAS =
  'id, creado_en, nombre, cooperativa, area, problema, frecuencia, impacto, ' +
  'provincia, tipo_organizacion, actividades, device_id'

/** Un uuid v4 tal como los genera `gen_random_uuid()`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Fila = {
  id: string
  creado_en: Date
  nombre: string
  cooperativa: string
  area: string | null
  problema: string
  frecuencia: string
  impacto: string
  provincia: string | null
  tipo_organizacion: string | null
  actividades: string[] | null
  device_id: string | null
}

function aProblema({ creado_en, tipo_organizacion, actividades, device_id, ...resto }: Fila): Problema {
  return {
    ...resto,
    creadoEn: creado_en,
    tipoOrganizacion: tipo_organizacion,
    deviceId: device_id,
    // Postgres devuelve null si la columna nunca se escribió; para quien
    // consume, "sin actividades" es una lista vacía y no una ausencia.
    actividades: actividades ?? [],
  }
}

/**
 * Interpreta el `?p=` de la URL.
 *
 * Cualquier cosa que no sea un entero positivo cae en la página 1: el parámetro
 * lo escribe quien quiera, así que "abc", "-3" y "1e9" tienen que aterrizar en
 * algún lado razonable en vez de reventar una consulta.
 */
export function paginaPedida(valor: string | string[] | undefined): number {
  const crudo = Array.isArray(valor) ? valor[0] : valor
  const n = Number(crudo)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

/**
 * Una página del listado, de la más reciente a la más vieja.
 *
 * El total y las filas salen de la misma conexión: son dos consultas, pero
 * abrir dos conexiones para una sola pantalla es desperdicio.
 *
 * Si piden una página que no existe devuelve la última, y avisa cuál sirvió en
 * `pagina`. Así `?p=99` con tres filas muestra las tres en vez de una tabla
 * vacía que parece un error.
 */
export async function listar(pedida: number): Promise<Pagina> {
  return withClient(async (client) => {
    const { rows: conteo } = await client.query<{ total: number }>(
      'select count(*)::int as total from problemas',
    )
    const total = conteo[0].total
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
    const pagina = Math.min(Math.max(1, pedida), paginas)

    const { rows } = await client.query<Fila>(
      `select ${COLUMNAS} from problemas order by creado_en desc limit $1 offset $2`,
      [POR_PAGINA, (pagina - 1) * POR_PAGINA],
    )

    return { filas: rows.map(aProblema), total, pagina, paginas }
  })
}

/**
 * Un problema por id, o null si no está.
 *
 * Chequea la forma del uuid antes de consultar: `where id = 'abc'` no devuelve
 * cero filas, tira un error de tipo de Postgres, y una URL mal escrita tiene
 * que terminar en un 404 y no en una página de error.
 */
export async function obtener(id: string): Promise<Problema | null> {
  if (!UUID.test(id)) return null

  return withClient(async (client) => {
    const { rows } = await client.query<Fila>(
      `select ${COLUMNAS} from problemas where id = $1`,
      [id],
    )
    return rows.length ? aProblema(rows[0]) : null
  })
}

/**
 * Borra un problema. Devuelve si existía.
 *
 * Chequea la forma del uuid antes de consultar, mismo motivo que `obtener`:
 * `where id = 'abc'` no borra cero filas, tira un error de tipo de Postgres.
 *
 * Es definitivo y no hay backup. La decisión fue consciente: el panel necesita
 * poder sacar spam o pruebas, y una fila oculta que igual hay que ir a limpiar
 * después era más máquina de la que el caso justifica.
 */
export async function borrar(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false

  return withClient(async (client) => {
    const { rowCount } = await client.query('delete from problemas where id = $1', [id])
    return rowCount === 1
  })
}
