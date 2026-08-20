import { borrar } from '@/lib/problemas'

/**
 * Borra un problema desde el panel.
 *
 * Cuelga de `/api/admin/`, así que `proxy.ts` pide credenciales antes de que
 * llegue acá. Si algún día se saca esa ruta del matcher, este endpoint queda
 * abierto y cualquiera puede vaciar la tabla: van juntos.
 *
 * Un uuid inexistente y uno mal formado dan lo mismo para quien llama —no
 * está— y ninguno de los dos es un error del server.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    return (await borrar(id))
      ? new Response(null, { status: 204 })
      : Response.json({ error: 'No existe.' }, { status: 404 })
  } catch (err) {
    console.error('DELETE /api/admin/problemas:', err)
    return Response.json({ error: 'No se pudo borrar.' }, { status: 500 })
  }
}
