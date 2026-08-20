import { connection } from 'next/server'
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
 *
 * `connection()` la saca del prerenderizado. Sin eso Next la resuelve en el
 * build —no usa `searchParams` ni ninguna otra API de request, así que no tiene
 * motivo para esperar— y serviría para siempre la digestión que existía cuando
 * se deployó: subir una nueva no cambiaría nada hasta el próximo build.
 *
 * Sin realtime pero al día en cada visita: son dos cosas distintas.
 */
export default async function Pagina() {
  await connection()

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
