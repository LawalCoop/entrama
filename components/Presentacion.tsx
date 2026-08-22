'use client'

import { useCallback, useEffect, useState } from 'react'
import { Prompt } from '@/app/icons'
import styles from '@/app/presentar/presentar.module.css'

type Cita = { texto: string; cooperativa: string; provincia: string | null }
type Cluster = {
  title: string
  description?: string
  tech_feasibility?: string
  tech_note?: string
  citas: Cita[]
}
type Totales = { problemas: number; organizaciones: number; provincias: number }

/**
 * Una pantalla por cluster, siempre.
 *
 * Los problemas no se paginan: desfilan en un ticker abajo. Paginarlos partía un
 * dolor de nueve problemas en tres pantallas iguales y dejaba la última a medio
 * llenar; el ticker los muestra todos sin que ninguno robe el protagonismo al
 * dolor, que es lo que la sala vino a entender.
 *
 * La idea es del código de AgroTIC, donde estaba resuelto así.
 */
type Pantalla =
  | { tipo: 'apertura' }
  | { tipo: 'panoramica' }
  | { tipo: 'cluster'; cluster: Cluster; indice: number }

const VIABILIDAD: Record<string, { etiqueta: string; color: string; signo: string }> = {
  alta: { etiqueta: 'Viabilidad alta', color: 'var(--color-a)', signo: '✓' },
  media: { etiqueta: 'Viabilidad media', color: 'var(--color-b)', signo: '◐' },
  exploratoria: { etiqueta: 'Exploratoria', color: 'var(--texto-suave)', signo: '✦' },
}

export default function Presentacion({
  clusters, totales, viabilidadVaria,
}: { clusters: Cluster[]; totales: Totales; viabilidadVaria: boolean }) {
  const pantallas: Pantalla[] = [
    { tipo: 'apertura' },
    { tipo: 'panoramica' },
    ...clusters.map((cluster, indice) => ({ tipo: 'cluster' as const, cluster, indice })),
  ]
  const [actual, setActual] = useState(0)

  const ir = useCallback((destino: number, desdeHistorial = false) => {
    const acotado = Math.min(Math.max(0, destino), pantallas.length - 1)
    setActual(acotado)
    if (desdeHistorial) return

    // Historial desde el principio: Atrás retrocede una pantalla en vez de sacar
    // de la presentación. La primera reemplaza la entrada de carga — si apilara,
    // esa entrada quedaría sin `state` y volver hasta ella movería el historial
    // sin mover la pantalla.
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
      // Espacio y PageUp/PageDown porque es lo que mandan los controles remotos
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
        {p.tipo === 'apertura' && <Apertura totales={totales} />}
        {p.tipo === 'panoramica' && <Panoramica clusters={clusters} viabilidadVaria={viabilidadVaria} />}
        {p.tipo === 'cluster' && (
          <Grupo
            cluster={p.cluster} indice={p.indice} total={clusters.length}
            viabilidadVaria={viabilidadVaria}
          />
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
        <span className={styles.progreso} aria-live="polite">{actual + 1} / {pantallas.length}</span>
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

/**
 * La apertura cuenta lo que trajo la sala, y sólo eso.
 *
 * Nada acá sale de la digestión. Los "dolores en común" —la cantidad de
 * clusters— estaban entre estas cifras y se fueron: ese número lo produce el
 * agente al agrupar, no lo trajo nadie. Aparece igual dos pantallas después,
 * donde corresponde: en la panorámica de los grupos.
 */
function Apertura({ totales }: { totales: Totales }) {
  const datos = [
    [totales.problemas, totales.problemas === 1 ? 'problema' : 'problemas'],
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

/**
 * El mapa: todos los dolores de un vistazo antes de entrar en cada uno.
 *
 * Las tarjetas se achican según cuántas haya, así entran en pantalla sin
 * scrollear — con trece no es lo mismo que con cuatro. El título se recorta a
 * tres líneas: acá alcanza con reconocerlo, se lee entero en su pantalla.
 */
function Panoramica({ clusters, viabilidadVaria }: { clusters: Cluster[]; viabilidadVaria: boolean }) {
  const n = clusters.length
  const anchoMin = n > 28 ? 190 : n > 18 ? 220 : n > 10 ? 260 : 320
  // Con muchos grupos las tarjetas tienen que achicarse o la grilla no entra en
  // pantalla, y una presentación que hay que scrollear deja de ser proyectable.
  // El título pasa a dos líneas: acá alcanza con reconocer el dolor, se lee
  // entero en su propia pantalla.
  const compacta = n > 8

  return (
    <div
      className={`${styles.panoramica} ${compacta ? styles.panoramicaCompacta : ''}`}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${anchoMin}px, 1fr))` }}
    >
      {clusters.map((c, i) => (
        <article key={i} className={styles.tarjeta}>
          <div className={styles.tarjetaCabecera}>
            <span className={styles.tarjetaNumero}>Grupo {i + 1}</span>
            {/* La pastilla va en la fila del número y no en una propia: ahorra
                el alto de una línea por tarjeta sin perder el dato. */}
            {viabilidadVaria && <Pastilla feasibility={c.tech_feasibility} chica />}
            <span className={styles.tarjetaCuenta}>{c.citas.length}</span>
          </div>
          <h3 className={styles.tarjetaTitulo}>{c.title}</h3>
        </article>
      ))}
    </div>
  )
}

function Grupo({
  cluster, indice, total, viabilidadVaria,
}: { cluster: Cluster; indice: number; total: number; viabilidadVaria: boolean }) {
  return (
    <div className={styles.grupo}>
      <div className={styles.grupoCabecera}>
        <span className={styles.dolorLabel}>
          Grupo {indice + 1} de {total}
          <span className={styles.tramo}> · {cluster.citas.length} {cluster.citas.length === 1 ? 'problema' : 'problemas'}</span>
        </span>
        <div className={styles.puntos} aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`${styles.punto} ${i === indice ? styles.puntoActivo : ''} ${i < indice ? styles.puntoPasado : ''}`}
            />
          ))}
        </div>
      </div>

      {/* El dolor protagoniza: ocupa el alto disponible y queda centrado. */}
      <div className={styles.grupoCentro}>
        <h2 className={styles.dolorTitulo}>{cluster.title}</h2>
        {cluster.description && <p className={styles.dolorDesc}>{cluster.description}</p>}
        {viabilidadVaria && (
          <div className={styles.pastillaFila}><Pastilla feasibility={cluster.tech_feasibility} /></div>
        )}
        {cluster.tech_note && <p className={styles.techNote}>{cluster.tech_note}</p>}
      </div>

      <Ticker citas={cluster.citas} />
    </div>
  )
}

function Pastilla({ feasibility, chica = false }: { feasibility?: string; chica?: boolean }) {
  const v = feasibility ? VIABILIDAD[feasibility] : undefined
  if (!v) return null
  return (
    <span
      className={`${styles.pastilla} ${chica ? styles.pastillaChica : ''}`}
      style={{ borderColor: v.color, color: v.color }}
    >
      <span aria-hidden>{v.signo}</span> {chica ? v.etiqueta.replace('Viabilidad ', '') : v.etiqueta}
    </span>
  )
}

/**
 * Las citas desfilando en loop.
 *
 * Se duplican y se anima hasta -50%: al llegar, la posición coincide con el
 * inicio del segundo juego y el corte no se ve. La vuelta dura ~5s por cita, con
 * un mínimo para que con pocas no quede corriendo.
 *
 * Con `prefers-reduced-motion` se detiene y pasa a ser scroll horizontal: la
 * página es pública y alguien la puede abrir en el celular, donde un carrusel
 * que no para es incómodo además de mareador.
 */
function Ticker({ citas }: { citas: Cita[] }) {
  if (citas.length === 0) return null

  const duracion = Math.max(28, citas.length * 5)
  const dobles = [...citas, ...citas]

  return (
    <div className={styles.ticker}>
      <div
        className={styles.tickerPista}
        style={{ animationDuration: `${duracion}s` }}
      >
        {dobles.map((c, i) => (
          <figure key={i} className={styles.tickerCita} aria-hidden={i >= citas.length}>
            <figcaption className={styles.tickerFuente}>
              {c.cooperativa}
              {c.provincia && <span className={styles.tickerProvincia}> · {c.provincia}</span>}
            </figcaption>
            <blockquote className={styles.tickerTexto}>{c.texto}</blockquote>
          </figure>
        ))}
      </div>
    </div>
  )
}
