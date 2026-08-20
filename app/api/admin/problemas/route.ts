import { listar, paginaPedida } from '@/lib/problemas'

/**
 * Los problemas recolectados, para el tab del panel de la dinámica.
 *
 * Cuelga de `/api/admin/` y no es un GET sobre `/api/problemas` porque el POST
 * de aquella ruta tiene que seguir público —es como envía el wizard— y el proxy
 * protege por ruta, no por método. Un namespace aparte hace que la regla sea
 * "todo lo de /api/admin pide credenciales", sin excepciones que se puedan
 * escribir al revés.
 *
 * La autenticación la resuelve `proxy.ts` antes de llegar acá. Si algún día se
 * saca esa ruta del matcher, este endpoint queda abierto: van juntos.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams.get('p') ?? undefined

  try {
    const { filas, total, pagina, paginas } = await listar(paginaPedida(p))
    return Response.json({ problemas: filas, total, pagina, paginas })
  } catch (err) {
    console.error('GET /api/admin/problemas:', err)
    return Response.json({ error: 'No se pudieron leer los problemas.' }, { status: 500 })
  }
}
