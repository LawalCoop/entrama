import Link from 'next/link'
import { listar, paginaPedida, POR_PAGINA, type Pagina } from '@/lib/problemas'
import FalloBase from './FalloBase'
import { fecha } from './formato'
import styles from './admin.module.css'

/**
 * El listado de lo recolectado.
 *
 * Lee la base directo, sin pasar por una API: es un Server Component, así que
 * la consulta y el HTML pasan en el mismo lugar. Un endpoint intermedio acá
 * solo agregaría un salto de red y un formato que nadie más consume.
 */

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Admin({ searchParams }: Props) {
  const { p } = await searchParams
  const pedida = paginaPedida(p)

  // La base caída se atiende acá y no en un error boundary: cuando el error
  // ocurre en el render inicial del server, todavía no se transmitió HTML y
  // React no tiene dónde montar el fallback de cliente, así que Next termina
  // sirviendo su pantalla genérica. Atajarlo acá da el mismo mensaje siempre.
  let datos: Pagina
  try {
    datos = await listar(pedida)
  } catch {
    return <FalloBase volverA={`/admin?p=${pedida}`} />
  }
  const { filas, total, pagina, paginas } = datos

  if (total === 0) {
    return (
      <div className={styles.vacio}>
        <h2 className={styles.vacioTitulo}>Todavía no hay problemas cargados</h2>
        <p className={styles.vacioDesc}>
          Cuando alguien complete <Link href="/recolectar">Recolectar</Link>, va a aparecer acá.
        </p>
      </div>
    )
  }

  const desde = (pagina - 1) * POR_PAGINA + 1
  const hasta = desde + filas.length - 1

  return (
    <div className={styles.pantalla}>
      <p className={styles.conteo}>
        {total === 1 ? '1 problema' : `${total} problemas`}
        {paginas > 1 && ` · mostrando ${desde}–${hasta}`}
      </p>

      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Nombre</th>
              <th scope="col">Cooperativa</th>
              <th scope="col">Área</th>
              <th scope="col">Frecuencia</th>
              <th scope="col">Impacto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className={styles.fila}>
                <td>
                  {/* El link envuelve la primera celda pero se estira sobre toda
                      la fila por CSS: así el área clickeable es la fila entera
                      sin anidar un <a> por columna. */}
                  <Link href={`/admin/${f.id}?p=${pagina}`} className={styles.filaLink}>
                    {fecha(f.creadoEn)}
                  </Link>
                </td>
                <td>{f.nombre}</td>
                <td>{f.cooperativa}</td>
                <td>{f.area}</td>
                <td>{f.frecuencia}</td>
                <td>{f.impacto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginas > 1 && <Paginacion pagina={pagina} paginas={paginas} />}
    </div>
  )
}

function Paginacion({ pagina, paginas }: { pagina: number; paginas: number }) {
  return (
    <nav className={styles.paginacion} aria-label="Paginación">
      {pagina > 1 ? (
        <Link href={`/admin?p=${pagina - 1}`} className={styles.pagBtn} rel="prev">
          ‹ Anterior
        </Link>
      ) : (
        <span className={`${styles.pagBtn} ${styles.pagBtnMudo}`} aria-hidden>
          ‹ Anterior
        </span>
      )}

      <span className={styles.pagEstado}>
        Página {pagina} de {paginas}
      </span>

      {pagina < paginas ? (
        <Link href={`/admin?p=${pagina + 1}`} className={styles.pagBtn} rel="next">
          Siguiente ›
        </Link>
      ) : (
        <span className={`${styles.pagBtn} ${styles.pagBtnMudo}`} aria-hidden>
          Siguiente ›
        </span>
      )}
    </nav>
  )
}
