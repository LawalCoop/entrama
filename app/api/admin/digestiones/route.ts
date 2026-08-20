import { guardar, validar, Invalido } from '@/lib/digestiones'

/**
 * Sube el resultado del clustering.
 *
 * Valida contra los problemas reales antes de guardar. Si algo no cierra
 * responde 422 con el detalle y no guarda nada: una digestión incompleta haría
 * desaparecer problemas de /presentar sin que nadie lo note.
 *
 * Con `forzar: true` guarda igual y la marca incompleta, para cuando el evento
 * está en curso y algo imperfecto es mejor que nada.
 */
export async function POST(request: Request) {
  let cuerpo: { texto?: unknown; forzar?: unknown }
  try {
    cuerpo = await request.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON válido.' }, { status: 400 })
  }

  if (typeof cuerpo.texto !== 'string' || !cuerpo.texto.trim()) {
    return Response.json({ error: 'Falta el texto de la digestión.' }, { status: 400 })
  }

  try {
    const { ok, clusters, problemas } = await validar(cuerpo.texto)

    if (!ok && cuerpo.forzar !== true) {
      return Response.json({ ok: false, problemas, clusters: clusters.length }, { status: 422 })
    }

    const id = await guardar(clusters, ok)
    return Response.json({ ok: true, id, clusters: clusters.length, completa: ok, problemas }, { status: 201 })
  } catch (err) {
    if (err instanceof Invalido) {
      return Response.json({ ok: false, problemas: [{ motivo: err.message, detalle: [] }] }, { status: 422 })
    }
    console.error('POST /api/admin/digestiones:', err)
    return Response.json({ error: 'No se pudo guardar la digestión.' }, { status: 500 })
  }
}
