import type { NextConfig } from 'next'

/**
 * `/live` lleva a la dinámica en vivo de FACTTIC.
 *
 * Los archivos viven en `public/live/` (ver `docs/live.md`), y Next sirve
 * `public/` por ruta exacta: `/live/dinamica.html` anda solo, pero `/live` a
 * secas
 * no resuelve a un índice como haría un servidor de archivos común.
 *
 * Redirect y no rewrite, aunque el rewrite dejara la URL más linda. Ese HTML
 * referencia sus assets con rutas relativas (`src="logo_facttic.png"`), y el
 * navegador las resuelve contra la URL que tiene en la barra: parado en `/live`,
 * sin barra final, `logo_facttic.png` apunta a la raíz del sitio y da 404. El
 * redirect lleva la barra a `/live/dinamica.html`, donde lo relativo cae bien —y
 * sigue estando bien si mañana esa copia suma un asset relativo más.
 */
const nextConfig: NextConfig = {
  redirects: async () => [
    { source: '/live', destination: '/live/dinamica.html', permanent: false },
  ],
}

export default nextConfig
