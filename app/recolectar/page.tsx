'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Wizard, { Step, useWizard } from '@/components/Wizard'
import Cargando from '@/components/Cargando'
import { AREAS, FRECUENCIAS, IMPACTOS, LIMITE_PROBLEMA } from '@/lib/recolectar'
import styles from './recolectar.module.css'

const MENSAJE_ENVIO_ERROR = 'Hubo un problema al enviar. Revisá tu conexión e intentá de nuevo.'

function PlusIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={10} />
      <line x1={12} y1={8} x2={12} y2={16} />
      <line x1={8} y1={12} x2={16} y2={12} />
    </svg>
  )
}

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
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(MENSAJE_ENVIO_ERROR)
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
        <Step validate={(d) => !!((d.area as string)?.trim())}><PasoArea /></Step>
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

function PasoDatos() {
  const { data, set } = useWizard()
  return (
    <>
      <StepHeader
        label="Primero lo primero"
        title="Nosotras somos Lawal, ¿y vos?"
        subtitle="Decinos tu nombre y a qué cooperativa pertenecés."
      />
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
        />
      </div>
    </>
  )
}

function PasoArea() {
  const { data, set } = useWizard()
  const selected = data.area as string | undefined
  const [otra, setOtra] = useState('')
  const [otraActiva, setOtraActiva] = useState(false)

  function selectArea(area: string) {
    setOtraActiva(false)
    set('area', area)
  }

  function activarOtra() {
    setOtraActiva(true)
    set('area', otra || '')
  }

  return (
    <>
      <StepHeader
        label={`Paso 2 de 5`}
        title="¿En qué área trabajás?"
        subtitle="Elegí el área donde encontrás el problema."
      />
      <div className={styles.options}>
        {AREAS.map((area) => (
          <button
            key={area}
            type="button"
            className={`${styles.option} ${selected === area && !otraActiva ? styles.optionSelected : ''}`}
            onClick={() => selectArea(area)}
          >
            {area}
          </button>
        ))}
        {otraActiva ? (
          <div className={`${styles.option} ${styles.optionSelected} ${styles.otraOpen}`}>
            <span className={styles.otraToggle}>
              <PlusIcon />
              Otra
            </span>
            <input
              className={styles.otraInput}
              type="text"
              placeholder="Escribí el área..."
              value={otra}
              onChange={(e) => {
                setOtra(e.target.value)
                set('area', e.target.value)
              }}
              autoFocus
            />
          </div>
        ) : (
          <button type="button" className={`${styles.option} ${styles.otraLabel}`} onClick={activarOtra}>
            <PlusIcon />
            Otra
          </button>
        )}
      </div>
    </>
  )
}

function PasoProblema() {
  const { data, set } = useWizard()
  const area = (data.area as string) || 'tu área'
  return (
    <>
      <StepHeader
        label="Paso 3 de 5"
        title="¿Qué problema encontrás?"
        subtitle={`Describí qué es lo que no funciona bien o podría mejorar en ${area}.`}
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
      <StepHeader label="Paso 4 de 5" title="¿Con qué frecuencia pasa?" />
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
        label="Paso 5 de 5"
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

function StepHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className={styles.header}>
      {label && <span className={styles.stepLabel}>{label}</span>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  )
}

function Field({ label, placeholder, value, onChange }: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
