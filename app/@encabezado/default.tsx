import Encabezado from '@/components/Encabezado'

/**
 * Lo que muestra el slot en rutas que no tiene cubiertas.
 *
 * Sin este archivo, Next devuelve 404 al navegar a un path que `@encabezado` no
 * matchea, aunque la página principal exista.
 */
export default function EncabezadoPorDefecto() {
  return <Encabezado titulo="Entrama" home />
}
