'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import styles from './Wizard.module.css'

const ACTIVE_COLOR = 'var(--color-a)'

type WizardCtx = {
  data: Record<string, unknown>
  set: (key: string, value: unknown) => void
  next: () => void
  back: () => void
  current: number
  total: number
  color: string
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
}

export default function Wizard({ children, onComplete }: WizardProps) {
  const [current, setCurrent] = useState(0)
  const [data, setData] = useState<Record<string, unknown>>({})
  const total = children.length

  const set = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const next = useCallback(() => {
    setCurrent((i) => {
      if (i >= total - 1) {
        onComplete(data)
        return i
      }
      return i + 1
    })
  }, [total, onComplete, data])

  const back = useCallback(() => {
    setCurrent((i) => Math.max(0, i - 1))
  }, [])

  const color = ACTIVE_COLOR

  const currentStep = children[current]
  const canAdvance = currentStep.props.validate
    ? currentStep.props.validate(data)
    : true

  return (
    <Ctx.Provider value={{ data, set, next, back, current, total, color }}>
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
            className={styles.btn}
            style={{
              backgroundColor: 'var(--borde)',
              color: 'var(--texto)',
              opacity: current === 0 ? 0.4 : 1,
            }}
            disabled={current === 0}
            onClick={back}
            aria-label="Atrás"
          >
            <Triangle direction="left" />
          </button>
          <button
            type="button"
            className={styles.btn}
            style={{
              backgroundColor: color,
              color: '#fff',
              opacity: canAdvance ? 1 : 0.4,
            }}
            disabled={!canAdvance}
            onClick={next}
            aria-label={current === total - 1 ? 'Enviar' : 'Siguiente'}
          >
            <Triangle direction="right" />
          </button>
        </div>
      </div>
    </Ctx.Provider>
  )
}

function Triangle({ direction }: { direction: 'left' | 'right' }) {
  const points = direction === 'right' ? '0,0 286,182 0,364' : '286,0 0,182 286,364'
  return (
    <svg
      width={24}
      height={30}
      viewBox="0 0 286 364"
      fill="currentColor"
      className={styles.triangle}
      aria-hidden="true"
    >
      <polygon points={points} />
    </svg>
  )
}
