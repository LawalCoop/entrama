'use client'

import styles from './admin.module.css'

/**
 * Red de seguridad para errores que no sean de la base — esos los atajan las
 * páginas directamente. Esto cubre un bug inesperado durante una navegación
 * del cliente, para que no quede una pantalla en blanco.
 *
 * No muestra el detalle del error: puede traer datos de conexión adentro.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.vacio}>
      <h2 className={styles.vacioTitulo}>Algo salió mal</h2>
      <p className={styles.vacioDesc}>No pudimos mostrar esta pantalla.</p>
      <button type="button" className={styles.pagBtn} onClick={reset}>
        Reintentar
      </button>
    </div>
  )
}
