'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Wizard, { Step, useWizard } from '@/components/Wizard'
import styles from './recolectar.module.css'

const AREAS = ['Producción', 'Logística', 'Administración', 'Comunicación', 'Ventas']
const FRECUENCIAS = ['Diario', 'Semanal', 'Mensual', 'Rara vez']
const IMPACTOS = [
  { label: 'Poco', desc: 'Es molesto pero se puede seguir trabajando.' },
  { label: 'Bastante', desc: 'Perdemos tiempo o cometemos errores seguido.' },
  { label: 'Mucho', desc: 'Frena el trabajo o genera problemas serios.' },
]

export default function Recolectar() {
  const router = useRouter()
  const [done, setDone] = useState(false)

  async function handleComplete(data: Record<string, unknown>) {
    await fetch('/api/problemas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setDone(true)
  }

  if (done) return <Confirmacion onReset={() => setDone(false)} onHome={() => router.push('/')} />

  return (
    <Wizard onComplete={handleComplete}>
      <Step validate={(d) => !!((d.cooperativa as string)?.trim())}><PasoDatos /></Step>
      <Step validate={(d) => !!((d.area as string)?.trim())}><PasoArea /></Step>
      <Step validate={(d) => !!((d.problema as string)?.trim())}><PasoProblema /></Step>
      <Step validate={(d) => !!(d.frecuencia && d.impacto)}><PasoImpacto /></Step>
      <Step><PasoResumen /></Step>
    </Wizard>
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
          label="Nombre (opcional)"
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
        <div className={`${styles.option} ${otraActiva ? styles.optionSelected : ''}`}>
          <button type="button" className={styles.otraToggle} onClick={activarOtra}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx={12} cy={12} r={10} />
              <line x1={12} y1={8} x2={12} y2={16} />
              <line x1={8} y1={12} x2={16} y2={12} />
            </svg>
            Otra
          </button>
          {otraActiva && (
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
          )}
        </div>
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
        maxLength={500}
        placeholder="Contanos qué pasa..."
        value={(data.problema as string) ?? ''}
        onChange={(e) => set('problema', e.target.value)}
      />
      <span className={styles.charCount}>
        {((data.problema as string) ?? '').length} / 500
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
            <strong>{label}</strong>
            <span className={styles.optionDesc}>{desc}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function PasoResumen() {
  const { data } = useWizard()
  const rows = [
    ['Área', data.area],
    ['Frecuencia', data.frecuencia],
    ['Impacto', data.impacto],
  ].filter(([, v]) => v) as [string, string][]

  return (
    <>
      <StepHeader
        label="Paso 5 de 5"
        title="Resumen"
        subtitle="Revisá lo que recolectamos antes de enviar."
      />
      <div className={styles.summary}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{label}</span>
            <span className={styles.summaryValue}>{value}</span>
          </div>
        ))}
        {!!data.problema && (
          <div className={styles.summaryBlock}>
            <span className={styles.summaryLabel}>Problema</span>
            <p className={styles.summaryText}>{data.problema as string}</p>
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
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
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
