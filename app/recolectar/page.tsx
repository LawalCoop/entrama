'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Wizard, { Step, useWizard } from '@/components/Wizard'
import Cargando from '@/components/Cargando'
import { leerPerfil, guardarPerfil, obtenerDeviceId, olvidarPerfil } from '@/lib/perfil'
import { FRECUENCIAS, IMPACTOS, LIMITE_PROBLEMA } from '@/lib/recolectar'
import styles from './recolectar.module.css'

const MENSAJE_ENVIO_ERROR = 'Hubo un problema al enviar. Revisá tu conexión e intentá de nuevo.'

export default function Recolectar() {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [empezar, setEmpezar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleEmpezar() {
    setCargando(true)
    window.setTimeout(() => {
      setCargando(false)
      setEmpezar(true)
    }, 1300)
  }

  async function handleComplete(data: Record<string, unknown>) {
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch('/api/problemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, deviceId: obtenerDeviceId() }),
      })
      if (!res.ok) throw new Error(MENSAJE_ENVIO_ERROR)

      // Se guarda recién ahora y no mientras se tipea: si alguien abandona a
      // mitad, no queda un perfil a medias precargando la próxima visita.
      guardarPerfil({
        nombre: ((data.nombre as string) ?? '').trim(),
        cooperativa: ((data.cooperativa as string) ?? '').trim(),
        provincia: (data.provincia as string) ?? '',
        tipoOrganizacion: (data.tipoOrganizacion as string) ?? '',
        actividades: (data.actividades as string[]) ?? [],
      })
      setDone(true)
    } catch {
      setError(MENSAJE_ENVIO_ERROR)
    } finally {
      setEnviando(false)
    }
  }

  if (done) return <Confirmacion onReset={() => setDone(false)} onHome={() => router.push('/')} />

  if (cargando) {
    return (
      <div className={styles.loadingWrap}>
        <Cargando />
      </div>
    )
  }

  if (!empezar) return <Bienvenida onEmpezar={handleEmpezar} />

  return (
    <>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Wizard onComplete={handleComplete} busy={enviando}>
        <Step validate={(d) => !!((d.nombre as string)?.trim() && (d.cooperativa as string)?.trim())}>
          <PasoDatos />
        </Step>
        <Step validate={(d) => !!((d.problema as string)?.trim())}><PasoProblema /></Step>
        <Step validate={(d) => !!(d.frecuencia && d.impacto)}><PasoImpacto /></Step>
        <Step><PasoResumen /></Step>
      </Wizard>
    </>
  )
}

function Bienvenida({ onEmpezar }: { onEmpezar: () => void }) {
  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeBlock}>
        <div className={styles.welcomeRings}>
          <div className={styles.welcomeRing3}>
            <div className={styles.welcomeRing2}>
              <div className={styles.welcomeRing1}>
                <svg
                  width={40}
                  height={40}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.welcomeIcon}
                  aria-hidden
                >
                  <circle cx={11} cy={11} r={8} />
                  <line x1={21} y1={21} x2={16.65} y2={16.65} />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <h2 className={styles.welcomeTitle}>Identificá oportunidades de mejora</h2>
        <p className={styles.welcomeDesc}>
          Contanos qué cosas del día a día de tu cooperativa podrían funcionar mejor con la ayuda de software.
        </p>
      </div>
      <button type="button" className={styles.welcomeBtn} onClick={onEmpezar}>
        Empezar
      </button>
    </div>
  )
}

type Opcion = { nombre: string; slug: string }

/**
 * Los catálogos del paso 1: cooperativas para sugerir, y provincias, tipos y
 * actividades para elegir.
 *
 * Fallan en silencio y devuelven listas vacías. Los tres campos de perfil son
 * opcionales, así que sin catálogo el wizard se completa igual, y el campo de
 * cooperativa sigue siendo un input de texto común. No hay estado de carga ni
 * de error porque no hay nada que la persona pueda hacer al respecto, y un
 * cartel de "no se pudieron cargar las opciones" sería ruido sobre algo que no
 * le importa a nadie.
 */
function useCatalogos() {
  const [cooperativas, setCooperativas] = useState<string[]>([])
  const [provincias, setProvincias] = useState<string[]>([])
  const [tipos, setTipos] = useState<Opcion[]>([])
  const [actividades, setActividades] = useState<Opcion[]>([])

  useEffect(() => {
    // Evita el setState sobre un componente desmontado si alguien pasa de paso
    // antes de que contesten.
    let vigente = true

    fetch('/api/cooperativas')
      .then((r) => r.json())
      .then((d) => { if (vigente) setCooperativas(d.cooperativas ?? []) })
      .catch(() => {})

    fetch('/api/opciones')
      .then((r) => r.json())
      .then((d) => {
        if (!vigente) return
        setProvincias(d.provincias ?? [])
        setTipos(d.tipos ?? [])
        setActividades(d.actividades ?? [])
      })
      .catch(() => {})

    return () => { vigente = false }
  }, [])

  return { cooperativas, provincias, tipos, actividades }
}

function PasoDatos() {
  const { data, set } = useWizard()
  const { cooperativas, provincias, tipos, actividades } = useCatalogos()
  const [precargado, setPrecargado] = useState(false)
  const elegidas = (data.actividades as string[]) ?? []

  /**
   * Precarga con lo que quedó de la última vez, propia o de la dinámica.
   *
   * Las dos apps viven en el mismo origen, así que comparten `localStorage`:
   * quien se anotó en /live ya tiene estos cinco campos guardados y acá
   * aparecen solos.
   *
   * Corre una sola vez y solo si el paso está vacío: si volviste con el botón
   * Atrás después de editar algo, pisarte lo tipeado sería lo peor que podría
   * hacer.
   */
  useEffect(() => {
    if (data.nombre || data.cooperativa) return
    const perfil = leerPerfil()
    if (!perfil) return

    set('nombre', perfil.nombre)
    set('cooperativa', perfil.cooperativa)
    if (perfil.provincia) set('provincia', perfil.provincia)
    if (perfil.tipoOrganizacion) set('tipoOrganizacion', perfil.tipoOrganizacion)
    if (perfil.actividades.length) set('actividades', perfil.actividades)
    setPrecargado(true)
    // Solo al montar: las dependencias reales son el estado inicial del wizard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function noSoyYo() {
    olvidarPerfil()
    for (const campo of ['nombre', 'cooperativa', 'provincia', 'tipoOrganizacion']) set(campo, '')
    set('actividades', [])
    setPrecargado(false)
  }

  function alternarActividad(slug: string) {
    set('actividades', elegidas.includes(slug)
      ? elegidas.filter((a) => a !== slug)
      : [...elegidas, slug])
  }

  return (
    <>
      <StepHeader
        label="Primero lo primero"
        title="Nosotras somos Lawal, ¿y vos?"
        subtitle="Decinos tu nombre y a qué cooperativa pertenecés."
      />
      {/* Visible y no escondido a propósito: precargar hace que sea fácil mandar
          algo firmado sin darse cuenta, y en una computadora prestada eso sería
          con el nombre de otra persona. Esta es la salida. */}
      {precargado && (
        <p className={styles.precargado}>
          Completamos tus datos de la última vez ·{' '}
          <button type="button" className={styles.noSoyYo} onClick={noSoyYo}>
            No soy yo
          </button>
        </p>
      )}
      <div className={styles.fields}>
        <Field
          label="Nombre"
          placeholder="Ej: María López"
          value={(data.nombre as string) ?? ''}
          onChange={(v) => set('nombre', v)}
        />
        <Field
          label="Cooperativa"
          placeholder="Ej: Cooperativa CALF"
          value={(data.cooperativa as string) ?? ''}
          onChange={(v) => set('cooperativa', v)}
          sugerencias={cooperativas}
        />

        {/* Los tres de abajo son opcionales: el paso avanza sin ellos. El
            "(opcional)" va en la etiqueta y no en un cartel aparte para que se
            lea justo donde se decide si completarlos. */}
        <Selector
          label="Provincia (opcional)"
          value={(data.provincia as string) ?? ''}
          onChange={(v) => set('provincia', v)}
          opciones={provincias.map((p) => ({ valor: p, etiqueta: p }))}
        />
        <Selector
          label="Tipo de organización (opcional)"
          value={(data.tipoOrganizacion as string) ?? ''}
          onChange={(v) => set('tipoOrganizacion', v)}
          opciones={tipos.map((t) => ({ valor: t.slug, etiqueta: t.nombre }))}
        />

        {actividades.length > 0 && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Actividad (opcional)</span>
            <div className={styles.casillas}>
              {actividades.map((a) => (
                <label key={a.slug} className={styles.casilla}>
                  <input
                    type="checkbox"
                    checked={elegidas.includes(a.slug)}
                    onChange={() => alternarActividad(a.slug)}
                  />
                  {a.nombre}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Selector({ label, value, onChange, opciones }: {
  label: string
  value: string
  onChange: (v: string) => void
  opciones: { valor: string; etiqueta: string }[]
}) {
  // Sin opciones no se dibuja: un desplegable vacío no ayuda a nadie y ocupa
  // lugar. Pasa si el catálogo no cargó.
  if (opciones.length === 0) return null

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Elegí una…</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
        ))}
      </select>
    </label>
  )
}

function PasoProblema() {
  const { data, set } = useWizard()
  return (
    <>
      <StepHeader
        title="¿Qué problema encontrás?"
        subtitle="Contanos qué es lo que no funciona bien o podría mejorar."
      />
      <textarea
        className={styles.textarea}
        rows={6}
        maxLength={LIMITE_PROBLEMA}
        placeholder="Contanos qué pasa..."
        value={(data.problema as string) ?? ''}
        onChange={(e) => set('problema', e.target.value)}
      />
      <span className={styles.charCount}>
        {((data.problema as string) ?? '').length} / {LIMITE_PROBLEMA}
      </span>
    </>
  )
}

function PasoImpacto() {
  const { data, set } = useWizard()
  return (
    <>
      <StepHeader title="¿Con qué frecuencia pasa?" />
      <div className={styles.chips}>
        {FRECUENCIAS.map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.chip} ${data.frecuencia === f ? styles.chipSelected : ''}`}
            onClick={() => set('frecuencia', f)}
          >
            {f}
          </button>
        ))}
      </div>
      <StepHeader label="" title="¿Cuánto afecta al equipo?" />
      <div className={styles.options}>
        {IMPACTOS.map(({ label, desc }) => (
          <button
            key={label}
            type="button"
            className={`${styles.option} ${data.impacto === label ? styles.optionSelected : ''}`}
            onClick={() => set('impacto', label)}
          >
            <span className={styles.optionText}>
              <strong>{label}</strong>
              <span className={styles.optionDesc}>{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

function PasoResumen() {
  const { data } = useWizard()
  const [vista, setVista] = useState<'datos' | 'problema'>('problema')
  const [canUp, setCanUp] = useState(false)
  const [canDown, setCanDown] = useState(false)
  const scrollRef = useRef<HTMLParagraphElement>(null)
  const problema = data.problema as string | undefined
  const rows = [
    ['Área', data.area],
    ['Frecuencia', data.frecuencia],
    ['Impacto', data.impacto],
  ].filter(([, v]) => v) as [string, string][]

  function actualizarFlechas() {
    const el = scrollRef.current
    if (!el) return
    setCanUp(el.scrollTop > 1)
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }

  useEffect(() => {
    actualizarFlechas()
  }, [])

  return (
    <>
      <StepHeader
        title="Resumen"
        subtitle="Revisá lo que recolectamos antes de enviar."
      />
      <div className={styles.resumenToggle} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'problema'}
          className={`${styles.resumenTab} ${vista === 'problema' ? styles.resumenTabActivo : ''}`}
          onClick={() => setVista('problema')}
        >
          Problema
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'datos'}
          className={`${styles.resumenTab} ${vista === 'datos' ? styles.resumenTabActivo : ''}`}
          onClick={() => setVista('datos')}
        >
          + Info
        </button>
      </div>
      <div className={styles.summary} role="tabpanel">
        {vista === 'datos' ? (
          rows.map(([label, value]) => (
            <div key={label} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{label}</span>
              <span className={styles.summaryValue}>{value}</span>
            </div>
          ))
        ) : (
          <div className={styles.summaryBlock}>
            <span className={styles.summaryLabel}>Problema</span>
            <div
              className={`${styles.problemaScrollWrap} ${canUp ? styles.problemaHasUp : ''} ${canDown ? styles.problemaHasDown : ''}`}
            >
              {canUp && (
                <span className={`${styles.problemaArrow} ${styles.problemaArrowUp}`} aria-hidden>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </span>
              )}
              <p ref={scrollRef} className={styles.summaryText} onScroll={actualizarFlechas}>
                {problema}
              </p>
              {canDown && (
                <span className={`${styles.problemaArrow} ${styles.problemaArrowDown}`} aria-hidden>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Confirmacion({ onReset, onHome }: { onReset: () => void; onHome: () => void }) {
  return (
    <div className={styles.confirmation}>
      <div className={styles.checkCircle}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--texto-accento)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className={styles.confirmTitle}>Información recopilada</h2>
      <p className={styles.confirmDesc}>
        Gracias por compartir. Tu aporte nos ayuda a entender mejor las necesidades de tu cooperativa.
      </p>
      <button type="button" className={styles.btnOutline} onClick={onReset}>
        Agregar otro problema
      </button>
      <button type="button" className={styles.btnPrimary} onClick={onHome}>
        Volver al inicio
      </button>
    </div>
  )
}

/**
 * La etiqueta de paso se calcula sola.
 *
 * Estaban escritas a mano —"Paso 3 de 5"— y con eso, sacar o agregar un paso
 * dejaba mintiendo a todas las de abajo. El wizard ya sabe en cuál está y
 * cuántos hay; que lo diga él.
 *
 * `label` sigue existiendo para el primer paso, que dice "Primero lo primero"
 * en vez del número. Pasar cadena vacía la esconde.
 */
function StepHeader({ label, title, subtitle }: { label?: string; title: string; subtitle?: string }) {
  const { current, total } = useWizard()
  const texto = label ?? `Paso ${current + 1} de ${total}`

  return (
    <div className={styles.header}>
      {texto && <span className={styles.stepLabel}>{texto}</span>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  )
}

function Field({ label, placeholder, value, onChange, sugerencias }: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  /** Si viene, el campo autocompleta contra esta lista sin dejar de aceptar texto libre. */
  sugerencias?: string[]
}) {
  // `<datalist>` nativo en vez de un combo propio: el browser se encarga del
  // filtrado, del teclado y de la accesibilidad, y en celular sale el
  // comportamiento que la gente ya conoce. Sigue siendo un input de texto, así
  // que una cooperativa que no está en la lista se escribe igual — que es
  // justo lo que tiene que pasar cuando alguien viene de una nueva.
  const listaId = sugerencias ? `sugerencias-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listaId}
        autoComplete="off"
      />
      {sugerencias && sugerencias.length > 0 && (
        <datalist id={listaId}>
          {sugerencias.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      )}
    </label>
  )
}
