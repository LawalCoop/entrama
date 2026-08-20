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
  /**
   * Dónde empezar y con qué. Sirven para retomar sin volver al principio: quien
   * acaba de mandar un problema y quiere cargar otro no tiene por qué contar de
   * nuevo quién es.
   *
   * Son valores iniciales, no controlados: se leen al montar y después el wizard
   * sigue por su cuenta. Para retomar de nuevo hay que remontarlo, con `key`.
   */
  pasoInicial?: number
  datosIniciales?: Record<string, unknown>
}

export default function Wizard({
  children,
  onComplete,
  busy = false,
  pasoInicial = 0,
  datosIniciales,
}: WizardProps) {
  // Acotado al rango real: un `pasoInicial` fuera de los pasos que existen
  // dejaría `children[current]` en undefined y la pantalla en blanco.
  const [current, setCurrent] = useState(() =>
    Math.min(Math.max(0, pasoInicial), children.length - 1))
  const [data, setData] = useState<Record<string, unknown>>(datosIniciales ?? {})
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
