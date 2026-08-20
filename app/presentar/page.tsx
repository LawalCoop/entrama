import Link from 'next/link'
import Presentacion from '@/components/Presentacion'
import { ultimaParaPresentar } from '@/lib/digestiones'
import styles from './presentar.module.css'

/**
 * La lectura proyectable de la última digestión.
 *
 * Server Component: lee la base y arma el HTML de una. Sin realtime a propósito
 * — una presentación que cambia sola mientras la proyectás es un problema, no
 * una función.
 */
export default async function Pagina() {
  let datos
  try {
    datos = await ultimaParaPresentar()
  } catch (err) {
    console.error('/presentar:', err)
    return <Vacio titulo="No se pudo cargar la presentación" detalle="Puede ser la base de datos. Probá de nuevo en un momento." />
  }

  if (!datos) {
    return (
      <Vacio
        titulo="Todavía no hay nada que presentar"
        detalle="Cuando se suba una digestión desde el panel, acá aparece la lectura de los problemas agrupados por lo que tienen en común."
      />
    )
  }

  return (
    <>
      {!datos.completa && (
        // Se avisa donde se ve, no solo en la base: quien proyecta tiene que
        // saber que hay problemas que no están en ninguna pantalla.
        <p className={styles.aviso} role="status">
          Esta digestión se subió incompleta: hay problemas que no quedaron en ningún grupo.
        </p>
      )}
      <Presentacion clusters={datos.clusters} totales={datos.totales} />
    </>
  )
}

function Vacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className={styles.vacio}>
      <h2 className={styles.vacioTitulo}>{titulo}</h2>
      <p className={styles.vacioDesc}>{detalle}</p>
      <Link href="/" className={styles.vacioLink}>Volver al inicio</Link>
    </div>
  )
}
