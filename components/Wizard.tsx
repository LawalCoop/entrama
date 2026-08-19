'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Prompt } from '@/app/icons'
import styles from './Wizard.module.css'

const ACTIVE_COLOR = 'var(--color-a)'

type WizardCtx = {
  data: Record<string, unknown>
  set: (key: string, value: unknown) => void
  next: () => void
  back: () => void
  current: number
  total: number
}

const Ctx = createContext<WizardCtx>(null!)

export function useWizard() {
  return useContext(Ctx)
}

type StepProps = {
  children: ReactNode
  validate?: (data: Record<string, unknown>) => boolean
}

export function Step({ children }: StepProps) {
  return <>{children}</>
}

type WizardProps = {
  children: ReactElement<StepProps>[]
  onComplete: (data: Record<string, unknown>) => void | Promise<void>
  /** True mientras onComplete está en curso: deshabilita Enviar y evita el doble envío. */
  busy?: boolean
}

export default function Wizard({ children, onComplete, busy = false }: WizardProps) {
  const [current, setCurrent] = useState(0)
  const [data, setData] = useState<Record<string, unknown>>({})
  const total = children.length

  const set = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  // `onComplete` va acá, en el handler, no dentro del updater: React puede
  // invocar el updater dos veces en StrictMode, y ahí un envío doble era seguro.
  const next = useCallback(() => {
    if (current >= total - 1) {
      onComplete(data)
      return
    }
    setCurrent((i) => i + 1)
  }, [current, total, onComplete, data])

  const back = useCallback(() => {
    setCurrent((i) => Math.max(0, i - 1))
  }, [])

  const currentStep = children[current]
  const canAdvance = currentStep.props.validate
    ? currentStep.props.validate(data)
    : true

  return (
    <Ctx.Provider value={{ data, set, next, back, current, total }}>
      <div className={styles.wizard}>
        <div className={styles.progress}>
          {children.map((_, i) => (
            <div
              key={i}
              className={styles.segment}
              style={{
                backgroundColor: i <= current
                  ? ACTIVE_COLOR
                  : 'var(--borde)',
              }}
            />
          ))}
        </div>
        <div className={styles.body}>{children[current]}</div>
        <div className={styles.nav}>
          <button
            type="button"
            className={`${styles.btn} ${styles.atras}`}
            style={{ opacity: current === 0 ? 0.4 : 1 }}
            disabled={current === 0}
            onClick={back}
            aria-label="Atrás"
          >
            <Prompt direction="left" width={24} height={30} className={styles.triangle} />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.siguiente}`}
            style={{ opacity: canAdvance && !busy ? 1 : 0.4 }}
            disabled={!canAdvance || busy}
            onClick={next}
            aria-label={current === total - 1 ? 'Enviar' : 'Siguiente'}
          >
            {current === total - 1 ? (
              <span className={styles.btnLabel}>Enviar</span>
            ) : (
              <Prompt direction="right" width={24} height={30} className={styles.triangle} />
            )}
          </button>
        </div>
      </div>
    </Ctx.Provider>
  )
}
