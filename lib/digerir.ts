/**
 * El prompt de clustering: agrupa los problemas recolectados por dolor común.
 *
 * La plantilla es la guía que trajo el equipo, con un solo cambio: la línea que
 * le describe al agente el formato de su entrada. La original venía de otra
 * encuesta —`sector · tipo_de_actor — urgente: "…" || mediano plazo: "…"`— y
 * dejarla ahí sería mentirle sobre lo que le estamos pasando.
 *
 * Lo demás queda tal cual, incluida la parte que más importa: agrupa por el
 * DOLOR, nunca por la solución. La guía se cuida explícitamente de que el agente
 * invente tecnologías antes de entender qué duele; las soluciones son un paso
 * posterior.
 *
 * El prompt se genera para copiar y pegar en el agente que sea. No hay llamada a
 * ninguna API acá, ni API key en ningún lado.
 */
import { withClient } from './db'

const PLANTILLA = `Sos un facilitador de un taller con cooperativas agropecuarias, cooperativas TIC, universidades, gobierno y productores. Tu tarea es agrupar los siguientes **problemas** que reportaron los participantes en CLUSTERS por NATURALEZA DEL DOLOR COMÚN.

⚠️ Acotamos a problemas resolubles con tecnología (software, datos, IoT/sensores, conectividad, automatización, IA). Si una entrada habla de problemas puramente legales, políticos, sociales sin componente tecnológico, igual integrala en el cluster que mejor encaje pero no inventes uno aparte para eso.

{{audience}}

⚠️ MUY IMPORTANTE — qué hacer y qué NO hacer:

✅ Sí: agrupar por el TIPO DE PROBLEMA / DOLOR COMÚN. Las soluciones se proponen en un paso POSTERIOR.
❌ No: nombrar el cluster con una solución, una tecnología, una plataforma o un sistema.

Ejemplos de títulos BUENOS (problema/dolor):
- "Datos productivos dispersos en papel y planillas"
- "Falta de información de temperatura en silos"
- "Deficiencias en geoposicionamiento de tractores"
- "Falta de información meteorológica hiperlocal"
- "Mala interpretación del clima que afecta el riego"
- "Producción manual sin trazabilidad"
- "Silobolsas, humedad y seguridad sin monitoreo"
- "Conectividad rural intermitente que rompe la operación"
- "Falta de visibilidad en la cadena de frío y logística"
- "Procesos administrativos cooperativos cargados a mano"
- "Asambleas y participación de socios alejados"
- "Trazabilidad ausente desde el campo hasta el cliente"
- "Mediciones a ojo que se traducen en pérdidas"

Ejemplos de títulos MALOS (suenan a solución / tecnología):
- "Sistema integral de gestión cooperativa"
- "Plataforma IoT para campo y cadena de frío"
- "App móvil de trazabilidad blockchain"
- "Implementar sensores LoRa"
- "Desarrollar marketplace cooperativo"

Reglas para armar los clusters:
- Creá tantos clusters como dolores distintos aparezcan en los datos. NO hay máximo. Es preferible tener más clusters precisos que pocos clusters con problemas mezclados.
- Mínimo 3 clusters.
- Cada problema reportado debe pertenecer a EXACTAMENTE UN cluster. Trata de que ningún problema quede oculto o forzado en un cluster que no le corresponde.
- Cada cluster debe poder "verse" desde afuera: si alguien lee el título, tiene que entender el dolor sin necesidad de leer los IDs. Si un cluster mezcla dos dolores distintos, dividilo.
- Título: corto, máximo 80 caracteres, en lenguaje del agro, NOMBRA EL DOLOR / EL PATRÓN DE PROBLEMA, nunca una solución o tecnología.
- Descripción: 1-2 oraciones (máx 240 caracteres) describiendo el patrón compartido — qué tienen en común estos problemas, en qué contexto aparece el dolor. No menciones soluciones, productos, ni tecnologías específicas. Apuntá a 200 caracteres y dejá margen.

⚠️ FORMATO DE LOS member_refs:
Cada problema viene precedido de un identificador hexadecimal único entre corchetes — por ejemplo \`[a3f9c1b8]\` o \`[2d4e6f01]\`. Para \`member_refs\` devolvé EXACTAMENTE esos strings hex tal cual aparecen, sin alterar caracteres. Por ejemplo: \`"member_refs": ["a3f9c1b8", "2d4e6f01", "7c3a8b9f"]\`.

⚠️ MUY IMPORTANTE: NO inventes refs nuevos, NO los abrevies, NO los traduzcas a números. Copiá literal el ref que aparece junto a cada problema. Antes de cerrar tu respuesta, releé cada ref que pusiste en cada cluster y verificá contra la lista que efectivamente describe ese problema.

Problemas a agrupar (formato: \`[ref] actividades · tipo de organización · provincia — frecuencia, impacto — "el problema tal como lo escribieron"\`):

{{needs_items}}

Devolvé EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto extra antes ni después) con esta estructura:

{
  "clusters": [
    {
      "title": "string, máx 80 caracteres, NOMBRE DEL PROBLEMA, no de la solución",
      "description": "string, máx 240 caracteres (apuntá a 200), describe el patrón/dolor compartido sin mencionar soluciones",
      "member_refs": ["a3f9c1b8", "2d4e6f01", "7c3a8b9f"]
    }
  ]
}

Restricciones:
- "clusters" tiene mínimo 3, sin máximo. Creá todos los que necesites para que cada dolor tenga su propio espacio.
- Cada "member_refs" debe ser un array no vacío de los strings hex provistos junto a cada problema (no inventes refs).
- La unión de todos los "member_refs" debe cubrir TODOS los refs provistos, sin duplicados ni omisiones (cada problema en exactamente un cluster).
- Antes de cerrar, verificá que cada ref que asignaste a un cluster realmente describe el dolor de ese cluster. Si tenés dudas, releé el problema asociado al ref.
`

type Fila = {
  id: string
  problema: string
  provincia: string | null
  tipo_organizacion: string | null
  actividades: string[] | null
  frecuencia: string
  impacto: string
  /** El nombre legible del tipo; el slug no sirve para que el agente calibre. */
  tipo_nombre: string | null
}

/**
 * Los refs que la guía pide: hex corto, uno por problema.
 *
 * Ocho caracteres del uuid alcanzan de sobra, pero se alargan si dos colisionan.
 * Un ref repetido rompería en silencio la regla de "cada problema en exactamente
 * un cluster": el agente asignaría uno solo y el otro problema desaparecería sin
 * que nadie lo note.
 */
function refs(filas: Fila[]): Map<string, string> {
  for (let largo = 8; largo <= 32; largo++) {
    const mapa = new Map(filas.map((f) => [f.id, f.id.replace(/-/g, '').slice(0, largo)]))
    if (new Set(mapa.values()).size === filas.length) return mapa
  }
  // Imposible con uuids distintos, pero devolver algo ambiguo sería peor.
  return new Map(filas.map((f) => [f.id, f.id.replace(/-/g, '')]))
}

/**
 * Quiénes participan, derivado de los datos.
 *
 * Fijo mentiría en cuanto cambie quién completa el formulario, y el agente usa
 * esta línea para calibrar el vocabulario de los títulos.
 */
function audiencia(filas: Fila[]): string {
  const tipos = [...new Set(filas.map((f) => f.tipo_nombre ?? f.tipo_organizacion).filter(Boolean))] as string[]
  const provincias = [...new Set(filas.map((f) => f.provincia).filter(Boolean))] as string[]

  const partes: string[] = []
  if (tipos.length) partes.push(`Los participantes se identificaron como: ${tipos.join(', ')}.`)
  if (provincias.length) partes.push(`Provincias representadas: ${provincias.join(', ')}.`)
  return partes.join(' ')
}

function item(f: Fila, ref: string, actividades: Map<string, string>): string {
  // Nombres y no slugs: el agente lee esto para calibrar el vocabulario de los
  // títulos, y 'producto-elaborado' no es como se habla.
  const suyas = (f.actividades ?? []).map((a) => actividades.get(a) ?? a)

  const contexto = [
    suyas.join('/') || null,
    f.tipo_nombre ?? f.tipo_organizacion,
    f.provincia,
  ].filter(Boolean).join(' · ')

  // El texto en una sola línea: la guía enumera un problema por renglón, y un
  // salto de línea adentro partiría uno en dos a los ojos del agente.
  const texto = f.problema.replace(/\s+/g, ' ').trim()

  return `[${ref}] ${contexto || 'sin datos de contexto'} — ${f.frecuencia}, impacto ${f.impacto} — "${texto}"`
}

export type ProblemaRef = { id: string; texto: string }

/**
 * El mapa ref → problema que el prompt le mostró al agente.
 *
 * Lo usa la validación de las digestiones para saber qué refs eran válidos y
 * cuáles quedaron sin agrupar. Sale de la misma función que arma el prompt a
 * propósito: si la lógica de refs viviera duplicada, el día que cambie una de
 * las dos copias la validación empezaría a rechazar digestiones buenas.
 */
export async function refsActuales(): Promise<Map<string, ProblemaRef>> {
  const filas = await withClient(async (client) => {
    const { rows } = await client.query<{ id: string; problema: string }>(
      'select id, problema from problemas order by creado_en',
    )
    return rows
  })

  const mapa = refs(filas as Fila[])
  return new Map(filas.map((f) => [mapa.get(f.id)!, { id: f.id, texto: f.problema }]))
}

export type Prompt = { texto: string; problemas: number }

/** El prompt listo para copiar, con todos los problemas adentro. */
export async function generarPrompt(): Promise<Prompt> {
  const filas = await withClient(async (client) => {
    const { rows } = await client.query<Fila>(
      `select p.id, p.problema, p.provincia, p.tipo_organizacion, p.actividades,
              p.frecuencia, p.impacto, t.nombre as tipo_nombre
       from problemas p
       left join tipos_organizacion t on t.slug = p.tipo_organizacion
       order by p.creado_en`,
    )
    return rows
  })

  if (filas.length === 0) return { texto: '', problemas: 0 }

  // El catálogo, para traducir los slugs guardados a sus nombres.
  const actividades = await withClient(async (client) => {
    const { rows } = await client.query<{ slug: string; nombre: string }>(
      'select slug, nombre from actividades',
    )
    return new Map(rows.map((r) => [r.slug, r.nombre]))
  })

  const mapa = refs(filas)
  const items = filas.map((f) => item(f, mapa.get(f.id)!, actividades)).join('\n')

  return {
    texto: PLANTILLA
      .replace('{{audience}}', audiencia(filas))
      .replace('{{needs_items}}', items),
    problemas: filas.length,
  }
}
