import styles from './WLogo.module.css'

/**
 * La W del header. Usa el Color A.
 *
 * Se pinta por CSS: `--marca-w` se define por paleta en globals.css y ya vale el
 * color guardado antes del primer pintado, así la W no parpadea
 * default→guardado como haría si el src dependiera del estado de React. Al
 * cambiar de paleta, `data-palette` actualiza la variable y la imagen cambia
 * sola, sin un render de React para el logo.
 *
 * El click lo maneja `BotonPaleta`, que la envuelve — igual que al triángulo de
 * las secciones, para que los dos se comporten igual.
 *
 * A diferencia del logotipo del footer, la W NO va recortada al contenido: la
 * marca necesita su aire para leerse, y sin él se deforma. Por eso el PNG es
 * cuadrado. `aspect-ratio: 1` reproduce esa proporción (el mismo hint que daban
 * width/height) y evita el salto de layout.
 */
export default function WLogo() {
  return <div className={styles.w} aria-hidden="true" />
}
