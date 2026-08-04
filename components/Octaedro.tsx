import styles from './Octaedro.module.css'

/**
 * Octaedro girando, armado con ocho triángulos de la marca.
 *
 * Va en transforms 3D de CSS, sin librería: la figura son ocho caras planas y
 * el browser las compone solo con `preserve-3d`.
 *
 * Geometría, con circunradio R = 60px:
 *   arista        s = R·√2      = 84.853px
 *   altura cara   h = s·√3/2    = 73.485px
 *   centro→arista d = R/√2      = 42.426px
 *
 * Cada cara nace con su base en el centro y se lleva a su lugar con
 * `rotateY(A) translateZ(d) rotateX(t)`. La inclinación sale de exigir que el
 * ápice caiga justo en el polo: -h·cos(t) = -R y d - h·sin(t) = 0, de donde
 * t = asin(d/h) = 35.264°. Las cuatro caras de abajo usan 180 - t.
 *
 * Cada cara es un SVG y no un div con `clip-path` a propósito: el halo se hace
 * con un `feGaussianBlur` DENTRO del SVG, en vez de un `filter` de CSS sobre el
 * elemento. Un filtro CSS sobre un hijo de `preserve-3d` lo obliga a rasterizar
 * como textura plana, y puede arruinar la composición 3D; acá el elemento sigue
 * siendo un plano normal y el desenfoque pasa en su render interno.
 */
const D = 42.426
const ARRIBA = 35.264
const ABAJO = 180 - ARRIBA
const OPACIDAD = [0.75, 0.55, 0.35, 0.5]

/** El triángulo llena el viewBox: 100/86.6 = 1.1547 = 2/√3, o sea equilátero. */
const PUNTOS = '50,0 100,86.6 0,86.6'
const DIFUSION = 'oct-difusion'

function Cara({ giro, inclinacion, opacidad }: { giro: number; inclinacion: number; opacidad: number }) {
  return (
    <svg
      viewBox="0 0 100 86.6"
      className={styles.cara}
      style={{
        transform: `rotateY(${giro}deg) translateZ(${D}px) rotateX(${inclinacion}deg)`,
        opacity: opacidad,
      }}
    >
      {/* cuerpo translúcido */}
      <polygon points={PUNTOS} fill="currentColor" opacity={0.34} />
      {/* halo: el trazo difuminado, que es lo que enciende el borde */}
      <polygon
        points={PUNTOS}
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        opacity={0.75}
        filter={`url(#${DIFUSION})`}
      />
      {/* filo nítido encima, para que el halo tenga de dónde salir */}
      <polygon points={PUNTOS} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.9} />
    </svg>
  )
}

export default function Octaedro() {
  return (
    <div className={styles.escena} aria-hidden="true">
      {/* Un solo filtro para las ocho caras. */}
      <svg className={styles.defs}>
        <defs>
          <filter
            id={DIFUSION}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>
      </svg>

      <div className={styles.solido}>
        {[0, 1, 2, 3].map((k) => (
          <Cara key={`arriba-${k}`} giro={45 + k * 90} inclinacion={ARRIBA} opacidad={OPACIDAD[k]} />
        ))}
        {[0, 1, 2, 3].map((k) => (
          <Cara
            key={`abajo-${k}`}
            giro={45 + k * 90}
            inclinacion={ABAJO}
            opacidad={OPACIDAD[(k + 2) % 4]}
          />
        ))}
      </div>
    </div>
  )
}
