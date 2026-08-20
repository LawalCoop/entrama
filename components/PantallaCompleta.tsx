'use client'

import { useEffect, useState } from 'react'
import styles from './PantallaCompleta.module.css'

type Doc = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void | Promise<void>
}

type Nodo = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>
}

/**
 * Botón de pantalla completa: pide el modo fullscreen del navegador (o sale de
 * él). El ícono es un cuadrado con las cuatro esquinas pintadas, en Color A.
 *
 * La API estándar cubre Chrome/Android y Safari iOS 16.4+. El estado se sigue
 * con `fullscreenchange` y no con el click, así también se actualiza si el
 * usuario sale con Esc o desde el menú del navegador.
 */
export default function PantallaCompleta() {
  const [activo, setActivo] = useState(false)

  useEffect(() => {
    const doc = document as Doc
    function sync() {
      setActivo(!!(doc.fullscreenElement ?? doc.webkitFullscreenElement))
    }
    sync()
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  async function toggle() {
    const doc = document as Doc
    const nodo = document.documentElement as Nodo
    try {
      if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
      } else {
        await (nodo.requestFullscreen?.() ?? nodo.webkitRequestFullscreen?.())
      }
    } catch {
      // Sin soporte o gesto bloqueado: no hay nada que hacer.
    }
  }

  return (
    <button
      type="button"
      className={styles.boton}
      onClick={toggle}
      aria-label={activo ? 'Salir de pantalla completa' : 'Pantalla completa'}
      aria-pressed={activo}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 4H5a1 1 0 0 0-1 1v4" />
        <path d="M15 4h4a1 1 0 0 1 1 1v4" />
        <path d="M9 20H5a1 1 0 0 1-1-1v-4" />
        <path d="M15 20h4a1 1 0 0 0 1-1v-4" />
      </svg>
    </button>
  )
}
