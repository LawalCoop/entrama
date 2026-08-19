/**
 * Íconos de las dos caras: el triángulo del isotipo Lawal.
 *
 * Es el mismo triángulo que la marca tiene suelto arriba a la derecha de la W,
 * aislado. Va en SVG y no como PNG a propósito: la figura es un isósceles
 * exacto, así que se reproduce sin pérdida, queda nítido a cualquier tamaño y
 * toma el color de `--color-a` sin tener que elegir entre siete archivos.
 *
 * Proporción tomada del asset original (364x286 = 1.2727), verificada contra el
 * ancho del triángulo a distintas alturas.
 *
 * Recolectar apunta abajo, como el original; Presentar es el mismo triángulo
 * invertido. Misma figura, sentido opuesto — junta contra proyecta.
 *
 * Sin halo: el glow es de la marca, no de la interfaz.
 */
const ANCHO = 22
const ALTO = ANCHO / 1.2727
const ARRIBA = (24 - ALTO) / 2
const ABAJO = ARRIBA + ALTO
const IZQ = (24 - ANCHO) / 2
const DER = IZQ + ANCHO

const ESTILO = { flexShrink: 0, alignSelf: 'center' } as const

type Props = { size?: number; color?: string }

/** Recolectar: el triángulo del isotipo, apuntando hacia adentro. */
export function ClipboardList({ size = 24, color = 'var(--color-a)' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={ESTILO}>
      <polygon points={`${IZQ},${ARRIBA} ${DER},${ARRIBA} 12,${ABAJO}`} />
    </svg>
  )
}

/**
 * El mismo triángulo girado 90°, apuntando a la derecha: es el signo de prompt
 * del header, en lugar de un `>`.
 *
 * El caracter mayor-que es un símbolo matemático y las fuentes lo centran sobre
 * el eje matemático, no sobre la base — así que flota por encima de las letras
 * aunque las cajas estén bien alineadas. Un triángulo se apoya donde le digamos.
 *
 * Girado, el original (364x286) queda 286x364, y ese es el viewBox: sin relleno
 * alrededor, para que el alto que le pida el CSS sea alto de figura.
 *
 * La dirección apunta a la derecha por defecto (el prompt del header); `left`
 * lo gira para los botones de navegación del wizard. Misma figura, espejada.
 */
export function Prompt({
  className,
  direction = 'right',
  width,
  height,
}: {
  className?: string
  direction?: 'right' | 'left'
  width?: number
  height?: number
}) {
  const points = direction === 'right' ? '0,0 286,182 0,364' : '286,0 0,182 286,364'
  return (
    <svg
      viewBox="0 0 286 364"
      fill="currentColor"
      className={className}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <polygon points={points} />
    </svg>
  )
}

/** Presentar: el mismo triángulo, invertido. */
export function Presentation({ size = 24, color = 'var(--color-a)' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={ESTILO}>
      <polygon points={`${IZQ},${ABAJO} ${DER},${ABAJO} 12,${ARRIBA}`} />
    </svg>
  )
}
