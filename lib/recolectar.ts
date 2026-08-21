/**
 * Las opciones del formulario y las reglas que las validan, en un solo lugar.
 *
 * Vivían dentro del componente cliente, que es exactamente donde no sirven: el
 * `validate` de cada paso del wizard corre en el browser y cualquiera puede
 * saltearlo pegándole al endpoint directo. El server tiene que volver a validar
 * igual, y si para eso repite las listas, tarde o temprano una de las dos copias
 * se queda vieja. Acá las dos puntas leen la misma definición.
 */

export const FRECUENCIAS = ['Diario', 'Semanal', 'Mensual', 'Rara vez'] as const

export const IMPACTOS = [
  { label: 'Poco', desc: 'Es molesto pero se puede seguir trabajando.' },
  { label: 'Bastante', desc: 'Perdemos tiempo o cometemos errores seguido.' },
  { label: 'Mucho', desc: 'Frena el trabajo o genera problemas serios.' },
] as const

/** Cuánto texto admite la descripción del problema. */
export const LIMITE_PROBLEMA = 1000

/** Tope para los campos de una línea (nombre, cooperativa, área). */
export const LIMITE_CORTO = 120

/**
 * Tope del email. Es el máximo que permite la RFC 5321, y va aparte de
 * `LIMITE_CORTO` porque `texto()` rechaza lo que se pasa en vez de recortarlo:
 * con 120 un email largo entraría como null y se perdería sin que nadie se
 * entere.
 */
export const LIMITE_EMAIL = 254

/**
 * Con qué se decide si algo "parece" un email.
 *
 * Deliberadamente flojo: algo, un arroba, algo, un punto, algo. No valida de
 * verdad —eso sólo lo hace mandar un mail— y sólo alimenta un aviso; nunca
 * bloquea un envío ni descarta lo que la persona escribió.
 *
 * `dinamica.html` tiene una copia de esta misma expresión: usa scripts
 * clásicos y no puede importar un módulo. Si cambia acá, cambiar allá.
 */
export const PARECE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Cuántas actividades se guardan como mucho.
 *
 * El formulario ofrece las del catálogo, así que en uso normal son pocas; el
 * tope es contra un POST armado a mano que mande mil.
 */
export const LIMITE_ACTIVIDADES = 20

/**
 * Frecuencia e impacto son dominios cerrados: no hay forma de elegir algo fuera
 * de la lista en la UI, así que lo que venga distinto es un POST armado a mano.
 */
const FRECUENCIAS_VALIDAS: ReadonlySet<string> = new Set(FRECUENCIAS)
const IMPACTOS_VALIDOS: ReadonlySet<string> = new Set(IMPACTOS.map((i) => i.label))

export type Problema = {
  nombre: string
  cooperativa: string
  /** Dónde está el problema. Se dejó de preguntar; las filas viejas lo tienen. */
  area: string | null
  problema: string
  frecuencia: string
  impacto: string
  /** Perfil, opcional: el wizard los pide pero no bloquea si faltan. */
  email: string | null
  provincia: string | null
  tipoOrganizacion: string | null
  actividades: string[]
  /** De qué dispositivo vino. Null si el navegador tiene el storage bloqueado. */
  deviceId: string | null
}

export type Validacion =
  | { ok: true; valor: Problema }
  | { ok: false; motivo: string }

/** Devuelve el texto recortado, o null si no es un string con contenido dentro del límite. */
function texto(valor: unknown, limite: number): string | null {
  if (typeof valor !== 'string') return null
  const limpio = valor.trim()
  if (!limpio || limpio.length > limite) return null
  return limpio
}

/**
 * Valida el cuerpo de un envío del wizard.
 *
 * Devuelve el motivo en vez de tirar: quien llama decide si lo muestra o lo
 * loguea. El motivo nombra el campo pero no repite lo que mandaron, así no
 * termina reflejando input del usuario en la respuesta.
 */
export function validar(payload: unknown): Validacion {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, motivo: 'El cuerpo tiene que ser un objeto.' }
  }

  const d = payload as Record<string, unknown>

  const nombre = texto(d.nombre, LIMITE_CORTO)
  if (!nombre) return { ok: false, motivo: `"nombre" es obligatorio (hasta ${LIMITE_CORTO} caracteres).` }

  const cooperativa = texto(d.cooperativa, LIMITE_CORTO)
  if (!cooperativa) return { ok: false, motivo: `"cooperativa" es obligatoria (hasta ${LIMITE_CORTO} caracteres).` }

  const problema = texto(d.problema, LIMITE_PROBLEMA)
  if (!problema) return { ok: false, motivo: `"problema" es obligatorio (hasta ${LIMITE_PROBLEMA} caracteres).` }

  const frecuencia = texto(d.frecuencia, LIMITE_CORTO)
  if (!frecuencia || !FRECUENCIAS_VALIDAS.has(frecuencia)) {
    return { ok: false, motivo: '"frecuencia" no es una de las opciones válidas.' }
  }

  const impacto = texto(d.impacto, LIMITE_CORTO)
  if (!impacto || !IMPACTOS_VALIDOS.has(impacto)) {
    return { ok: false, motivo: '"impacto" no es una de las opciones válidas.' }
  }

  // Los de perfil no bloquean: son datos de contexto, no parte de contar un
  // problema, y /recolectar es anónimo y voluntario. Lo que venga mal formado
  // se descarta en silencio en vez de rechazar el envío entero — perder el
  // problema por una provincia rara sería el peor canje posible.
  // `area` se dejó de preguntar en el wizard. Sigue aceptándose por si algún
  // cliente viejo la manda, y va null si no viene.
  const area = texto(d.area, LIMITE_CORTO)
  // El email no se valida acá y es a propósito: el formulario ya avisa si no
  // parece uno, y quien lo mande igual quiso dejarlo. Descartarlo en silencio
  // sería perder el único dato de contacto que dio, que no es lo mismo que
  // perder una provincia.
  const email = texto(d.email, LIMITE_EMAIL)
  const provincia = texto(d.provincia, LIMITE_CORTO)
  const tipoOrganizacion = texto(d.tipoOrganizacion, LIMITE_CORTO)
  const actividades = Array.isArray(d.actividades)
    ? d.actividades
        .map((a) => texto(a, LIMITE_CORTO))
        .filter((a): a is string => a !== null)
        .slice(0, LIMITE_ACTIVIDADES)
    : []

  const deviceId = texto(d.deviceId, LIMITE_CORTO)

  return {
    ok: true,
    valor: {
      nombre, cooperativa, area, problema, frecuencia, impacto,
      email, provincia, tipoOrganizacion, actividades, deviceId,
    },
  }
}
