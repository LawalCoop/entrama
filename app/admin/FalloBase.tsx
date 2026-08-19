import styles from './admin.module.css'

/**
 * Lo que se ve cuando la consulta a la base falla.
 *
 * Es un componente de server y "Reintentar" es un link común, no un botón con
 * onClick: así funciona aunque el JS no haya cargado, que es justo el escenario
 * en el que algo ya venía saliendo mal.
 *
 * No muestra el error: el mensaje de `pg` puede traer host y credenciales.
 */
export default function FalloBase({ volverA = '/admin' }: { volverA?: string }) {
  return (
    <div className={styles.vacio}>
      <h2 className={styles.vacioTitulo}>No se pudieron cargar los problemas</h2>
      <p className={styles.vacioDesc}>
        Puede ser la base de datos. Probá de nuevo en un momento.
      </p>
      <a className={styles.pagBtn} href={volverA}>
        Reintentar
      </a>
    </div>
  )
}
