import { generarPrompt } from '@/lib/digerir'

/**
 * El prompt de clustering, con todos los problemas adentro.
 *
 * Tiene que venir del server y no armarse en el tab: el panel solo tiene
 * cargada la página que está mirando, y el prompt los necesita todos.
 *
 * Cuelga de `/api/admin/`, así que `proxy.ts` pide credenciales antes de llegar
 * acá — y con razón: el prompt lleva el texto de cada problema adentro.
 */
export async function GET() {
  try {
    return Response.json(await generarPrompt())
  } catch (err) {
    console.error('GET /api/admin/digerir:', err)
    return Response.json({ error: 'No se pudo generar el prompt.' }, { status: 500 })
  }
}
