import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtener, paginaPedida, type Problema } from '@/lib/problemas'
import FalloBase from '../FalloBase'
import { fechaLarga } from '../formato'
import styles from '../admin.module.css'

/**
 * Un problema entero, sin recortar.
 *
 * Es la razón de que el listado sea una tabla: ahí entran muchos de un vistazo
 * porque el texto largo se lee acá.
 */

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Detalle({ params, searchParams }: Props) {
  const { id } = await params
  const { p } = await searchParams

  // Vuelve a la página desde la que se entró, no siempre a la primera.
  const volver = `/admin?p=${paginaPedida(p)}`

  let problema: Problema | null
  try {
    problema = await obtener(id)
  } catch {
    return <FalloBase volverA={volver} />
  }

  // Fuera del try: notFound() señaliza tirando, y tragarlo lo convertiría en un
  // "falló la base" que no es cierto.
  // Un uuid inexistente o mal formado son lo mismo para quien mira: no está.
  if (!problema) notFound()

  return (
    <div className={styles.detalle}>
      <Link href={volver} className={styles.volver}>
        ‹ Volver al listado
      </Link>

      <h2 className={styles.detalleTitulo}>{problema.problema}</h2>

      <dl className={styles.campos}>
        <Campo label="Quién" valor={problema.nombre} />
        <Campo label="Cooperativa" valor={problema.cooperativa} />
        <Campo label="Área" valor={problema.area} />
        <Campo label="Frecuencia" valor={problema.frecuencia} />
        <Campo label="Impacto" valor={problema.impacto} />
        <Campo label="Cargado" valor={fechaLarga(problema.creadoEn)} />
      </dl>
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className={styles.campo}>
      <dt className={styles.campoLabel}>{label}</dt>
      <dd className={styles.campoValor}>{valor}</dd>
    </div>
  )
}
