/**
 * Las fechas se muestran en hora de Argentina, no en la del server.
 *
 * `creado_en` es `timestamptz`, así que el instante viaja bien; lo que hay que
 * elegir es en qué huso leerlo. El server de Vercel corre en UTC y quien mira
 * el panel está acá, así que fijarlo es lo correcto — y además hace que el
 * texto no dependa de dónde se ejecutó el render.
 */
const ZONA = 'America/Argentina/Buenos_Aires'

const CORTA = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: ZONA,
})

const LARGA = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: ZONA,
})

export function fecha(d: Date): string {
  return CORTA.format(d)
}

export function fechaLarga(d: Date): string {
  return LARGA.format(d)
}
