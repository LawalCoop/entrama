import Cargando from '@/components/Cargando'

/**
 * El armazón ya no está acá adentro: header y footer viven en el layout raíz,
 * así que durante la carga no se desmontan y este fallback solo reemplaza el
 * contenido central.
 */
export default function Loading() {
  return <Cargando />
}
