import { registrar } from '@/lib/cooperativas'
import { withClient } from '@/lib/db'
import { validar } from '@/lib/recolectar'

/**
 * Recibe un envío del wizard de /recolectar y lo guarda.
 *
 * Vuelve a validar todo aunque el wizard ya lo haya hecho: el endpoint es
 * público y el `validate` de cada paso corre en el browser, así que es una guía
 * para quien completa el formulario, no una garantía para la base.
 *
 * El 400 dice qué campo está mal —el cliente es nuestro y ayuda a diagnosticar—
 * pero el 500 no cuenta nada: el detalle de una falla de base va al log del
 * server, no a la respuesta.
 */
export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON válido.' }, { status: 400 })
  }

  const validacion = validar(payload)
  if (!validacion.ok) {
    return Response.json({ error: validacion.motivo }, { status: 400 })
  }

  const { nombre, cooperativa, area, problema, frecuencia, impacto,
          email, provincia, tipoOrganizacion, actividades, deviceId } = validacion.valor

  try {
    const id = await withClient(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `insert into problemas
           (nombre, cooperativa, area, problema, frecuencia, impacto,
            email, provincia, tipo_organizacion, actividades, device_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id`,
        [nombre, cooperativa, area, problema, frecuencia, impacto,
         email, provincia, tipoOrganizacion, actividades, deviceId],
      )
      // El catálogo se alimenta al enviar y no al tipear: así no se llena con
      // lo que alguien escribió a medias y borró. Va después del insert y en un
      // try aparte porque es secundario — el problema ya está guardado, y no
      // vale perderlo porque falló una sugerencia para la próxima persona.
      try {
        await registrar(client, cooperativa)
      } catch (err) {
        console.error('POST /api/problemas: no se pudo registrar la cooperativa:', err)
      }

      return rows[0].id
    })

    return Response.json({ id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/problemas:', err)
    return Response.json({ error: 'No se pudo guardar el problema.' }, { status: 500 })
  }
}
