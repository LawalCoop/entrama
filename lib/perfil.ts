'use client'

/**
 * El perfil que las dos apps comparten a través de `localStorage`.
 *
 * /recolectar y /live se sirven desde el mismo origen (`entrama.vercel.app`),
 * y `localStorage` se guarda por origen: lo que escribe una lo lee la otra sin
 * que haya que transportar nada. No hace falta cookie — una cookie sirve para
 * que el servidor sepa quién sos, y acá quien lo necesita es el formulario, que
 * corre en el mismo navegador donde está el dato.
 *
 * El prefijo `facttic_` es histórico: las claves las inventó dinamica.html y
 * ahora las escriben las dos. Renombrarlas le borraría el `device_id` a todo el
 * que ya se anotó y lo obligaría a registrarse de nuevo, que es un precio peor
 * que un nombre viejo.
 */

const CLAVES = {
  deviceId: 'facttic_device_id',
  nombre: 'facttic_nombre',
  cooperativa: 'facttic_cooperativa',
  provincia: 'facttic_provincia',
  tipoOrganizacion: 'facttic_tipo_organizacion',
  actividades: 'facttic_actividades',
} as const

export type Perfil = {
  nombre: string
  cooperativa: string
  provincia: string
  tipoOrganizacion: string
  actividades: string[]
}

/**
 * Todo acceso pasa por acá porque `localStorage` tira si está bloqueado —modo
 * incógnito de algunos navegadores, o cookies de terceros apagadas— y una
 * excepción al montar dejaría el paso 1 en blanco. Sin almacenamiento el
 * formulario funciona igual, solo que sin precargar.
 */
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function escribir(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento no hay nada que hacer: el envío ya se hizo igual.
  }
}

/** El perfil guardado, o null si no hay ni nombre ni cooperativa. */
export function leerPerfil(): Perfil | null {
  const nombre = leer(CLAVES.nombre) ?? ''
  const cooperativa = leer(CLAVES.cooperativa) ?? ''
  if (!nombre && !cooperativa) return null

  let actividades: string[] = []
  try {
    const crudo = leer(CLAVES.actividades)
    if (crudo) {
      const parseado: unknown = JSON.parse(crudo)
      if (Array.isArray(parseado)) actividades = parseado.filter((a) => typeof a === 'string')
    }
  } catch {
    // Lo escribió otra versión de la app, o alguien lo editó a mano.
  }

  return {
    nombre,
    cooperativa,
    provincia: leer(CLAVES.provincia) ?? '',
    tipoOrganizacion: leer(CLAVES.tipoOrganizacion) ?? '',
    actividades,
  }
}

export function guardarPerfil(p: Perfil): void {
  escribir(CLAVES.nombre, p.nombre)
  escribir(CLAVES.cooperativa, p.cooperativa)
  escribir(CLAVES.provincia, p.provincia)
  escribir(CLAVES.tipoOrganizacion, p.tipoOrganizacion)
  escribir(CLAVES.actividades, JSON.stringify(p.actividades))
}

/**
 * El id del dispositivo, generándolo si no estaba.
 *
 * Misma clave y misma forma que `getDeviceId()` de dinamica.html a propósito:
 * quien pasa primero por acá llega a la dinámica ya identificado, y al revés.
 * Dos identidades paralelas en el mismo navegador no le servirían a nadie.
 */
export function obtenerDeviceId(): string | null {
  const guardado = leer(CLAVES.deviceId)
  if (guardado) return guardado

  try {
    const nuevo = crypto.randomUUID()
    escribir(CLAVES.deviceId, nuevo)
    return nuevo
  } catch {
    return null
  }
}

/**
 * Borra todo, incluido el `device_id`.
 *
 * Es lo que hace "No soy yo". El `device_id` también se va: si no, alguien en
 * una computadora prestada seguiría mandando problemas atados al dispositivo de
 * otra persona, que es justo lo que quiso deshacer.
 */
export function olvidarPerfil(): void {
  for (const clave of Object.values(CLAVES)) {
    try {
      localStorage.removeItem(clave)
    } catch {
      // Nada que hacer.
    }
  }
}
