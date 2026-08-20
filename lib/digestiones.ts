import { withClient } from './db'
import { refsActuales, type ProblemaRef } from './digerir'

/**
 * El resultado del clustering, validado contra los problemas reales.
 *
 * La guía le advierte al agente tres veces que no invente refs, que no los
 * abrevie y que cubra todos los problemas — señal de que se equivoca seguido.
 * Acá eso se comprueba en vez de confiarse: sabemos exactamente qué refs le
 * mostramos, así que faltantes, inventados y duplicados salen de comparar dos
 * conjuntos.
 */

export type Cluster = {
  title: string
  description?: string
  tech_feasibility?: string
  tech_note?: string
  member_refs: string[]
  /** Los uuid reales, resueltos al subir. Ver el comentario de la 0016. */
  member_ids: string[]
}

export type Problemas = { motivo: string; detalle: string[] }[]

export type Validacion = {
  ok: boolean
  clusters: Cluster[]
  /** Vacío si `ok`. Cada entrada dice qué falló y qué exactamente. */
  problemas: Problemas
}

/** Un error que no deja seguir: sin clusters no hay nada que validar. */
class Invalido extends Error {}

function leerClusters(texto: string): unknown[] {
  let json: unknown
  try {
    json = JSON.parse(texto)
  } catch {
    // Lo más común: el agente lo envolvió en ```json pese a que se le pidió que
    // no. Vale la pena rescatarlo en vez de mandar a la persona a limpiarlo.
    const sinCerca = texto.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    try {
      json = JSON.parse(sinCerca)
    } catch {
      throw new Invalido('No es JSON válido. Pegá el objeto tal como lo devolvió el agente.')
    }
  }

  if (typeof json !== 'object' || json === null || !Array.isArray((json as { clusters?: unknown }).clusters)) {
    throw new Invalido('El JSON no tiene un array "clusters" en la raíz.')
  }
  return (json as { clusters: unknown[] }).clusters
}

/**
 * Valida y resuelve los refs a uuid.
 *
 * Devuelve siempre los clusters, incluso si algo falla: quien sube puede
 * decidir guardarlos igual, y en ese caso se guarda lo que se pudo resolver.
 */
export async function validar(texto: string): Promise<Validacion> {
  const crudos = leerClusters(texto)
  const esperados = await refsActuales()

  const problemas: Problemas = []
  const clusters: Cluster[] = []
  const vistos = new Map<string, string[]>() // ref -> títulos donde apareció
  const inventados: string[] = []
  const sinRefs: string[] = []

  for (const [i, c] of crudos.entries()) {
    const o = (typeof c === 'object' && c !== null ? c : {}) as Record<string, unknown>
    const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim() : `Cluster ${i + 1} (sin título)`
    const refs = Array.isArray(o.member_refs) ? o.member_refs.filter((r): r is string => typeof r === 'string') : []

    if (refs.length === 0) sinRefs.push(title)

    const ids: string[] = []
    for (const ref of refs) {
      const p = esperados.get(ref)
      if (!p) {
        inventados.push(`${ref} (en "${title}")`)
        continue
      }
      ids.push(p.id)
      vistos.set(ref, [...(vistos.get(ref) ?? []), title])
    }

    clusters.push({
      title,
      description: typeof o.description === 'string' ? o.description : undefined,
      tech_feasibility: typeof o.tech_feasibility === 'string' ? o.tech_feasibility : undefined,
      tech_note: typeof o.tech_note === 'string' ? o.tech_note : undefined,
      member_refs: refs,
      member_ids: ids,
    })
  }

  // Aritmética de conjuntos: sabemos qué refs le mostramos al agente.
  const faltantes: ProblemaRef[] = []
  for (const [ref, p] of esperados) if (!vistos.has(ref)) faltantes.push({ ...p, id: ref })

  const duplicados = [...vistos.entries()].filter(([, ts]) => ts.length > 1)

  if (clusters.length < 3) {
    problemas.push({
      motivo: `Solo ${clusters.length} cluster${clusters.length === 1 ? '' : 's'}; la guía pide un mínimo de 3.`,
      detalle: [],
    })
  }
  if (sinRefs.length) {
    problemas.push({ motivo: 'Clusters sin ningún problema adentro:', detalle: sinRefs })
  }
  if (inventados.length) {
    problemas.push({
      motivo: inventados.length === 1
        ? '1 ref que no corresponde a ningún problema:'
        : `${inventados.length} refs que no corresponden a ningún problema:`,
      detalle: inventados,
    })
  }
  if (duplicados.length) {
    problemas.push({
      motivo: duplicados.length === 1
        ? '1 problema en más de un cluster:'
        : `${duplicados.length} problemas en más de un cluster:`,
      detalle: duplicados.map(([ref, ts]) => `${ref} → ${ts.join(' / ')}`),
    })
  }
  if (faltantes.length) {
    problemas.push({
      // Se listan con el texto y no solo el ref: así se ve de una si el que
      // falta es uno que estaba en el prompt que se mandó, o uno que se cargó
      // después de generarlo — en cuyo caso el agente no tuvo la culpa.
      motivo: faltantes.length === 1
        ? '1 problema que no quedó en ningún cluster:'
        : `${faltantes.length} problemas que no quedaron en ningún cluster:`,
      detalle: faltantes.map((f) => `[${f.id}] ${f.texto.slice(0, 90)}${f.texto.length > 90 ? '…' : ''}`),
    })
  }

  return { ok: problemas.length === 0, clusters, problemas }
}

/** Guarda una digestión. `completa` en false si se forzó pese a la validación. */
export async function guardar(clusters: Cluster[], completa: boolean): Promise<string> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      'insert into digestiones (clusters, completa) values ($1, $2) returning id',
      [JSON.stringify({ clusters }), completa],
    )
    return rows[0].id
  })
}

export type Digestion = { id: string; creadoEn: Date; clusters: Cluster[]; completa: boolean }

/** La última subida, que es la que /presentar va a mostrar. */
export async function ultima(): Promise<Digestion | null> {
  return withClient(async (client) => {
    const { rows } = await client.query<{
      id: string; creado_en: Date; clusters: { clusters: Cluster[] }; completa: boolean
    }>('select id, creado_en, clusters, completa from digestiones order by creado_en desc limit 1')

    if (!rows.length) return null
    const r = rows[0]
    return { id: r.id, creadoEn: r.creado_en, clusters: r.clusters.clusters ?? [], completa: r.completa }
  })
}

/** Una cita para proyectar: sin nombre, a propósito. */
export type Cita = { texto: string; cooperativa: string; provincia: string | null }

export type ClusterParaPresentar = {
  title: string
  description?: string
  tech_feasibility?: string
  /** La pista de qué tipo de solución existe. Es lo que dice algo distinto en
   *  cada cluster; la viabilidad suele repetirse. */
  tech_note?: string
  citas: Cita[]
}

export type ParaPresentar = {
  creadoEn: Date
  completa: boolean
  clusters: ClusterParaPresentar[]
  /** Para la pantalla de apertura. */
  totales: { problemas: number; organizaciones: number; provincias: number }
  /**
   * Si la viabilidad distingue algo.
   *
   * Cuando todos los clusters dan el mismo valor —pasó: trece veces "alta"— la
   * etiqueta es la misma trece veces y no informa nada. Que se muestre o no lo
   * decide el dato, no una constante.
   */
  viabilidadVaria: boolean
}

/**
 * La última digestión con sus problemas resueltos, lista para proyectar.
 *
 * **El `select` no trae `nombre` a propósito.** /presentar es público, y la
 * privacidad se resuelve acá y no en el render: si el nombre no está en el
 * payload, no puede filtrarse por un descuido de maquetación ni aparecer en el
 * HTML que cualquiera puede leer. Cada cita se firma con organización y
 * provincia, que alcanza para dar contexto sin exponer a quien completó un
 * formulario sin saber que iría a una pantalla.
 */
export async function ultimaParaPresentar(): Promise<ParaPresentar | null> {
  const d = await ultima()
  if (!d) return null

  const ids = [...new Set(d.clusters.flatMap((c) => c.member_ids))]
  if (ids.length === 0) return null

  const problemas = await withClient(async (client) => {
    const { rows } = await client.query<{
      id: string; problema: string; cooperativa: string; provincia: string | null
    }>(
      'select id, problema, cooperativa, provincia from problemas where id = any($1)',
      [ids],
    )
    return new Map(rows.map((r) => [r.id, r]))
  })

  const clusters = d.clusters.map((c) => ({
    title: c.title,
    description: c.description,
    tech_feasibility: c.tech_feasibility,
    tech_note: c.tech_note,
    citas: c.member_ids
      .map((id) => problemas.get(id))
      .filter((p) => p !== undefined)
      .map((p) => ({ texto: p.problema, cooperativa: p.cooperativa, provincia: p.provincia })),
  }))

  const todas = clusters.flatMap((c) => c.citas)
  const viabilidades = new Set(clusters.map((c) => c.tech_feasibility).filter(Boolean))

  return {
    viabilidadVaria: viabilidades.size > 1,
    creadoEn: d.creadoEn,
    completa: d.completa,
    clusters,
    totales: {
      // Los problemas se cuentan sobre los que efectivamente se resolvieron: si
      // una digestión quedó incompleta, decir 42 cuando se muestran 39 sería
      // decir algo que no es.
      problemas: todas.length,
      organizaciones: new Set(todas.map((c) => c.cooperativa)).size,
      provincias: new Set(todas.map((c) => c.provincia).filter(Boolean)).size,
    },
  }
}

export { Invalido }
