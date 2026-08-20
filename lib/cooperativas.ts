import { withClient } from './db'
import type { Client } from 'pg'
import { LIMITE_CORTO } from './recolectar'

/**
 * El catálogo de cooperativas, compartido entre /recolectar y la dinámica.
 *
 * Sirve para sugerir, no para validar: el nombre que la persona escribe se
 * sigue guardando tal cual en cada problema. Que una cooperativa no esté en el
 * catálogo nunca puede impedir que alguien cuente su problema.
 */

/** Los nombres para el autocompletado, alfabéticos. */
export async function listar(): Promise<string[]> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ nombre: string }>(
      'select nombre from cooperativas where activa order by nombre',
    )
    return rows.map((r) => r.nombre)
  })
}

/**
 * Suma una cooperativa al catálogo si no estaba.
 *
 * Recibe el client en vez de abrir uno propio: se llama desde el POST de
 * /api/problemas, que ya tiene una conexión abierta, y no vale gastar otra.
 *
 * El `on conflict` mira `slug`, que es una columna generada: "CALF", " calf " y
 * "Calf" apuntan a la misma fila y la segunda no hace nada. `do nothing` y no
 * `do update` a propósito — el primero que la escribió le puso un nombre, y no
 * hay razón para que el siguiente se lo pise con su forma de tipear.
 */
export async function registrar(client: Client, nombre: string): Promise<void> {
  const limpio = nombre.trim()
  if (!limpio || limpio.length > LIMITE_CORTO) return

  await client.query(
    'insert into cooperativas (nombre) values ($1) on conflict (slug) do nothing',
    [limpio],
  )
}
