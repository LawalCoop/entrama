import provincias from '@/public/provincias.json'
import { withClient } from './db'

/**
 * Las listas que los dos formularios comparten: el paso 1 de /recolectar y el
 * registro de dinamica.html.
 *
 * Cada una vive donde corresponde según si crece o no.
 *
 * **Provincias**: `public/provincias.json`. Son 24 y no cambian, así que no
 * ganan nada estando en la base —y una tabla editable en vivo es una forma más
 * de que alguien las rompa—. El JSON es fuente única igual: Next lo importa acá
 * en tiempo de compilación y `dinamica.html` lo trae con `fetch`, porque usa
 * scripts clásicos y un `import` de módulo correría después de su `init()`.
 *
 * **Tipos y actividades**: tablas. Las dos crecen con lo que la gente carga
 * —los formularios ofrecen "Otra"— y se editan desde el panel sin deployar.
 */

export const PROVINCIAS: readonly string[] = provincias

export type Opcion = { nombre: string; slug: string }

/** Un catálogo de la base, solo lo activo y en su orden. */
async function catalogo(tabla: 'tipos_organizacion' | 'actividades'): Promise<Opcion[]> {
  return withClient(async (client) => {
    const { rows } = await client.query<Opcion>(
      `select nombre, slug from ${tabla} where activa order by orden, nombre`,
    )
    return rows
  })
}

export type Opciones = {
  provincias: readonly string[]
  tipos: Opcion[]
  actividades: Opcion[]
}

/**
 * Todo junto, en una sola conexión.
 *
 * Los dos catálogos salen del mismo `withClient`: son dos consultas, pero abrir
 * dos conexiones para una sola pantalla es desperdicio.
 */
export async function listarOpciones(): Promise<Opciones> {
  return withClient(async (client) => {
    const q = async (tabla: string) =>
      (await client.query<Opcion>(
        `select nombre, slug from ${tabla} where activa order by orden, nombre`,
      )).rows

    return {
      provincias: PROVINCIAS,
      tipos: await q('tipos_organizacion'),
      actividades: await q('actividades'),
    }
  })
}
