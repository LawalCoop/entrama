'use client'

import { useCallback, useEffect, useState } from 'react'
import { Prompt } from '@/app/icons'
import styles from '@/app/presentar/presentar.module.css'

/** Cuántas citas entran en una pantalla sin que deje de leerse proyectada. */
const CITAS_POR_PANTALLA = 3

type Cita = { texto: string; cooperativa: string; provincia: string | null }
type Cluster = { title: string; description?: string; tech_feasibility?: string; citas: Cita[] }
type Totales = { problemas: number; organizaciones: number; provincias: number }

/**
 * Una pantalla proyectable.
 *
 * `apertura` es la primera; el resto son tramos de un cluster: la misma cabecera
 * y un puñado de citas. Un cluster de ocho ocupa tres pantallas en vez de
 * apretar ocho citas en una que nadie puede leer de lejos.
 */
type Pantalla =
  | { tipo: 'apertura' }
  | { tipo: 'cluster'; cluster: Cluster; indice: number; total: number; tramo: number; tramos: number; citas: Cita[] }

function armarPantallas(clusters: Cluster[]): Pantalla[] {
  const pantallas: Pantalla[] = [{ tipo: 'apertura' }]

  clusters.forEach((cluster, indice) => {
    // Un cluster sin citas igual ocupa una pantalla: que aparezca vacío es
    // información — significa que el agente lo inventó sin problemas adentro.
    const grupos: Cita[][] = []
    for (let i = 0; i < Math.max(cluster.citas.length, 1); i += CITAS_POR_PANTALLA) {
      grupos.push(cluster.citas.slice(i, i + CITAS_POR_PANTALLA))
    }
    grupos.forEach((citas, tramo) => {
      pantallas.push({
        tipo: 'cluster', cluster, indice, total: clusters.length,
        tramo, tramos: grupos.length, citas,
      })
    })
  })

  return pantallas
}

const COLOR_VIABILIDAD: Record<string, string> = {
  alta: 'var(--color-a)',
  media: 'var(--color-b)',
  exploratoria: 'var(--texto-suave)',
}

export default function Presentacion({ clusters, totales }: { clusters: Cluster[]; totales: Totales }) {
  const pantallas = armarPantallas(clusters)
  const [actual, setActual] = useState(0)

  const ir = useCallback((destino: number, desdeHistorial = false) => {
    const acotado = Math.min(Math.max(0, destino), pantallas.length - 1)
    setActual(acotado)
    if (desdeHistorial) return

    // Historial desde el principio, para que Atrás retroceda una pantalla en vez
    // de sacarte de la presentación. La primera reemplaza la entrada de carga:
    // si apilara, esa entrada quedaría sin `state` y volver hasta ella movería
    // el historial sin mover la pantalla.
    const estado = { pantalla: acotado }
    if (history.state?.pantalla === undefined) history.replaceState(estado, '')
    else history.pushState(estado, '')
  }, [pantallas.length])

  useEffect(() => {
    if (history.state?.pantalla === undefined) history.replaceState({ pantalla: 0 }, '')

    function alVolver(e: PopStateEvent) {
      if (typeof e.state?.pantalla === 'number') setActual(e.state.pantalla)
    }
    function alTeclear(e: KeyboardEvent) {
      // Espacio y PageDown/PageUp porque es lo que mandan los controles remotos
      // de presentación, que es como esto se va a usar en una sala.
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); ir(actual + 1) }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); ir(actual - 1) }
      if (e.key === 'Home') ir(0)
      if (e.key === 'End') ir(pantallas.length - 1)
    }

    window.addEventListener('popstate', alVolver)
    window.addEventListener('keydown', alTeclear)
    return () => {
      window.removeEventListener('popstate', alVolver)
      window.removeEventListener('keydown', alTeclear)
    }
  }, [actual, ir, pantallas.length])

  const p = pantallas[actual]

  return (
    <div className={styles.pantalla}>
      <div className={styles.lienzo}>
        {p.tipo === 'apertura' ? (
          <Apertura totales={totales} clusters={clusters.length} />
        ) : (
          <Cluster {...p} />
        )}
      </div>

      <nav className={styles.nav} aria-label="Navegación de la presentación">
        <button
          type="button" className={styles.btn} onClick={() => ir(actual - 1)}
          disabled={actual === 0} aria-label="Anterior"
          style={{ opacity: actual === 0 ? 0.3 : 1 }}
        >
          <Prompt direction="left" width={24} height={30} />
        </button>

        <span className={styles.progreso} aria-live="polite">
          {actual + 1} / {pantallas.length}
        </span>

        <button
          type="button" className={styles.btn} onClick={() => ir(actual + 1)}
          disabled={actual === pantallas.length - 1} aria-label="Siguiente"
          style={{ opacity: actual === pantallas.length - 1 ? 0.3 : 1 }}
        >
          <Prompt direction="right" width={24} height={30} />
        </button>
      </nav>
    </div>
  )
}

function Apertura({ totales, clusters }: { totales: Totales; clusters: number }) {
  const datos = [
    [totales.problemas, totales.problemas === 1 ? 'problema' : 'problemas'],
    [clusters, clusters === 1 ? 'dolor en común' : 'dolores en común'],
    [totales.organizaciones, totales.organizaciones === 1 ? 'organización' : 'organizaciones'],
    [totales.provincias, totales.provincias === 1 ? 'provincia' : 'provincias'],
  ] as const

  return (
    <div className={styles.apertura}>
      <h2 className={styles.aperturaTitulo}>Esto es lo que trajimos</h2>
      <div className={styles.cifras}>
        {datos.map(([n, etiqueta]) => (
          <div key={etiqueta} className={styles.cifra}>
            <span className={styles.cifraNumero}>{n}</span>
            <span className={styles.cifraEtiqueta}>{etiqueta}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Cluster({ cluster, indice, total, tramo, tramos, citas }: Extract<Pantalla, { tipo: 'cluster' }>) {
  return (
    <div className={styles.cluster}>
      <span className={styles.dolorLabel}>
        {cluster.tech_feasibility && (
          // Discreto a propósito: es una señal para quien después decide qué
          // construir, no lo que la sala vino a escuchar. Va acá y no en el
          // título porque ahí, con un título de dos líneas, quedaba flotando a
          // media altura sin pertenecer a ninguna.
          <span
            className={styles.viabilidad}
            style={{ background: COLOR_VIABILIDAD[cluster.tech_feasibility] ?? 'var(--texto-suave)' }}
            title={`Viabilidad técnica: ${cluster.tech_feasibility}`}
            aria-label={`Viabilidad técnica: ${cluster.tech_feasibility}`}
          />
        )}
        Dolor {indice + 1} de {total}
        {tramos > 1 && <span className={styles.tramo}> · {tramo + 1}/{tramos}</span>}
      </span>

      <h2 className={styles.dolorTitulo}>{cluster.title}</h2>

      {/* La descripción solo en el primer tramo: repetirla en cada pantalla del
          mismo cluster le saca lugar a las citas, que son lo que importa. */}
      {cluster.description && tramo === 0 && (
        <p className={styles.dolorDesc}>{cluster.description}</p>
      )}

      <div className={styles.citas}>
        {citas.map((c, i) => (
          <figure key={i} className={styles.cita}>
            <blockquote className={styles.citaTexto}>{c.texto}</blockquote>
            <figcaption className={styles.citaFuente}>
              {c.cooperativa}
              {c.provincia && ` · ${c.provincia}`}
            </figcaption>
          </figure>
        ))}
        {citas.length === 0 && (
          <p className={styles.citaTexto} style={{ opacity: 0.6 }}>
            Este dolor no tiene problemas asociados.
          </p>
        )}
      </div>
    </div>
  )
}
