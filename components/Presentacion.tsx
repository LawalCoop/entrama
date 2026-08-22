'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Prompt } from '@/app/icons'
import styles from '@/app/presentar/presentar.module.css'

type Cita = { texto: string; cooperativa: string; provincia: string | null }
type Cluster = {
  title: string
  description?: string
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

export default function Presentacion({
  clusters, totales,
}: { clusters: Cluster[]; totales: Totales }) {
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

  /*
   * Mientras se presenta, la ventana queda clavada.
   *
   * Esta pantalla se proyecta: el alto tiene que ser siempre el de la ventana y
   * nada puede scrollear. Sin esto, un contenido que crece empuja la página,
   * aparece la barra de scroll y el header y el footer —que son sticky— se
   * despegan de sus bordes en medio de una presentación.
   *
   * Se marca el `body` desde acá y no con una clase en el layout porque el
   * armazón es común a todas las rutas, y las demás sí tienen que poder
   * scrollear. Se limpia al desmontar: si no, salir de /presentar dejaría el
   * resto de la app sin scroll.
   */
  useEffect(() => {
    document.body.dataset.presentando = ''
    return () => { delete document.body.dataset.presentando }
  }, [])

  /*
   * La navegación vive en el footer, que monta el layout raíz.
   *
   * Va por portal y no mudando el componente allá arriba porque los botones
   * necesitan el estado de la presentación —en qué pantalla está y cuántas
   * hay—, y el footer se monta una sola vez para toda la sesión. El nodo se
   * busca después del montaje: en el server no existe.
   */
  const [ancla, setAncla] = useState<HTMLElement | null>(null)
  useEffect(() => { setAncla(document.getElementById('nav-presentacion')) }, [])

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

  const nav = (
    <nav className={styles.nav} aria-label="Navegación de la presentación">
      <button
        type="button" className={styles.btn} onClick={() => ir(actual - 1)}
        disabled={actual === 0} aria-label="Anterior"
        style={{ opacity: actual === 0 ? 0.3 : 1 }}
      >
        <Prompt direction="left" width={18} height={22} />
      </button>
      <span className={styles.progreso} aria-live="polite">{actual + 1} / {pantallas.length}</span>
      <button
        type="button" className={styles.btn} onClick={() => ir(actual + 1)}
        disabled={actual === pantallas.length - 1} aria-label="Siguiente"
        style={{ opacity: actual === pantallas.length - 1 ? 0.3 : 1 }}
      >
        <Prompt direction="right" width={18} height={22} />
      </button>
    </nav>
  )

  return (
    <>
      {ancla && createPortal(nav, ancla)}
      {/* La panorámica es la única que quiere todo el espacio: son tarjetas en
          grilla, no un texto que se lee mejor angosto. Las demás conservan el
          ancho de lectura. */}
      <div className={`${styles.pantalla} ${p.tipo === 'panoramica' ? styles.pantallaAncha : ''}`}>
        <div className={styles.lienzo}>
          {p.tipo === 'apertura' && <Apertura totales={totales} />}
          {p.tipo === 'panoramica' && <Panoramica clusters={clusters} />}
          {p.tipo === 'cluster' && (
            <Grupo cluster={p.cluster} indice={p.indice} total={clusters.length} />
          )}
        </div>
      </div>
    </>
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
function Panoramica({ clusters }: { clusters: Cluster[] }) {
  const n = clusters.length
  // Más anchas que antes: la panorámica usa el ancho completo de la pantalla,
  // así que pedir más por tarjeta da menos columnas y tarjetas más grandes en
  // vez de una fila larga de fichitas.
  const anchoMin = n > 28 ? 260 : n > 18 ? 300 : n > 10 ? 360 : 460
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
            <span className={styles.tarjetaNumero}>Cluster {i + 1}</span>
            <span className={styles.tarjetaCuenta}>{c.citas.length}</span>
          </div>
          <h3 className={styles.tarjetaTitulo}>{c.title}</h3>
        </article>
      ))}
    </div>
  )
}

function Grupo({
  cluster, indice, total,
}: { cluster: Cluster; indice: number; total: number }) {
  return (
    <div className={styles.grupo}>
      <div className={styles.grupoCabecera}>
        <span className={styles.dolorLabel}>
          Cluster {indice + 1} de {total}
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
      </div>

      <Ticker citas={cluster.citas} />
    </div>
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
/**
 * Cómo se dibuja una cita para que llene el alto de su card.
 *
 * La franja mide siempre lo mismo —si creciera, movería todo lo de arriba al
 * cambiar de cluster— y las cards la llenan. Lo que no puede pasar es
 * desperdiciar ese alto: "control de stock" en un renglón dejaba tres cuartos
 * de card vacíos.
 *
 * Entonces el texto se dimensiona según cuánto es. Corto va en cuerpo grande y
 * dos renglones; largo, más chico, más ancho y más renglones. El ancho sale de
 * dividir los caracteres por los renglones que se buscan, y va en `ch` —el
 * ancho de un cero en ese mismo cuerpo—, así que la cuenta se sostiene aunque
 * cambie el tamaño de letra con la pantalla.
 *
 * Los topes son para los dos extremos: una cita de una palabra no puede dar una
 * card de dos centímetros, y una de 600 caracteres no puede dar una más ancha
 * que la pantalla.
 */
function medidaDeCita(texto: string) {
  const largo = texto.trim().length

  const { lineas, cuerpo } =
    largo <= 30 ? { lineas: 2, cuerpo: styles.citaGrande }
      : largo <= 90 ? { lineas: 3, cuerpo: styles.citaMedia }
        : { lineas: 4, cuerpo: styles.citaChica }

  /*
   * El 1.35 es el aire del corte de palabra.
   *
   * Dividir caracteres por renglones da el ancho de un párrafo perfecto, que no
   * existe: las palabras no se parten, así que cada renglón termina antes del
   * borde y hacen falta más. Sin ese margen, un texto de 47 caracteres pedía
   * cuatro renglones donde había tres, y se recortaba con puntos suspensivos
   * teniendo lugar de sobra al costado.
   */
  const ancho = Math.ceil((largo / lineas) * 1.35)

  return { cuerpo, lineas, ancho: Math.min(60, Math.max(12, ancho)) }
}

function Card({ cita, duplicada }: { cita: Cita; duplicada: boolean }) {
  const { cuerpo, lineas, ancho } = medidaDeCita(cita.texto)

  return (
    <figure
      className={`${styles.tickerCita} ${cuerpo}`}
      style={{ width: `${ancho}ch` }}
      data-copia={duplicada ? '1' : '0'}
      aria-hidden={duplicada}
    >
      <figcaption className={styles.tickerFuente}>
        {cita.cooperativa}
        {cita.provincia && <span className={styles.tickerProvincia}> · {cita.provincia}</span>}
      </figcaption>
      <blockquote className={styles.tickerTexto} style={{ WebkitLineClamp: lineas }}>
        {cita.texto}
      </blockquote>
    </figure>
  )
}

function Ticker({ citas }: { citas: Cita[] }) {
  const marco = useRef<HTMLDivElement>(null)
  const pista = useRef<HTMLDivElement>(null)
  /*
   * Si las citas entran en pantalla, no desfilan.
   *
   * Un cluster de un solo problema tenía su card cruzando la pantalla y
   * reapareciendo por el otro lado: se lee como un error y distrae de lo único
   * que hay que mirar, que es el dolor. Cuando entran, se quedan quietas y
   * centradas.
   *
   * Se mide la primera copia y no la pista entera, porque la pista lleva las
   * citas duplicadas para que el loop no tenga costura: su ancho es siempre el
   * doble y no diría nada. Y se remide al cambiar el tamaño de la ventana,
   * porque el ancho de las cards está en `clamp` y depende de la pantalla.
   */
  const [entran, setEntran] = useState(false)

  useEffect(() => {
    function medir() {
      if (!marco.current || !pista.current) return
      const copia = Array.from(pista.current.children).slice(0, citas.length) as HTMLElement[]
      if (!copia.length) return
      const ultima = copia[copia.length - 1]
      const ancho = ultima.offsetLeft + ultima.offsetWidth - copia[0].offsetLeft
      setEntran(ancho <= marco.current.clientWidth)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [citas])

  if (citas.length === 0) return null

  const duracion = Math.max(28, citas.length * 5)
  const dobles = [...citas, ...citas]

  return (
    <div ref={marco} className={`${styles.ticker} ${entran ? styles.tickerQuieto : ''}`}>
      <div
        ref={pista}
        className={styles.tickerPista}
        style={{ animationDuration: `${duracion}s` }}
      >
        {dobles.map((c, i) => (
          <Card key={i} cita={c} duplicada={i >= citas.length} />
        ))}
      </div>
    </div>
  )
}
