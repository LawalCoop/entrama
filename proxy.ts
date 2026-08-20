import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Deja pasar a /admin solo a quien sepa la contraseña.
 *
 * En Next 16 el middleware se llama Proxy; el comportamiento es el mismo.
 *
 * Basic Auth y no una pantalla de login porque acá el navegador hace todo el
 * trabajo: pide las credenciales, las recuerda y las reenvía. No hace falta
 * sesión, cookie ni tabla de usuarios para una clave compartida de equipo.
 *
 * Que la doc de Next desaconseje el proxy para autorización es cierto y vale
 * tenerlo presente: esto es una puerta con una llave sola, no un sistema de
 * permisos. No distingue quién entró ni registra qué miró. Si /admin algún día
 * necesita eso, el reemplazo es auth de verdad, no parchar esto.
 */

const USUARIO = 'admin'

/**
 * Compara sin filtrar el tiempo que tarda.
 *
 * Un `===` corta en el primer byte distinto, y esa diferencia de tiempo alcanza
 * para ir adivinando la contraseña de a un carácter. Este recorre siempre todo.
 * Va sobre bytes (no `node:crypto`) para no atarse a un runtime.
 */
function igualEnTiempoConstante(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  // El largo se filtra igual, pero saber el largo no acerca a saber el valor.
  if (x.length !== y.length) return false

  let dif = 0
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i]
  return dif === 0
}

function pedirCredenciales() {
  return new NextResponse('Necesitás credenciales para entrar.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Entrama admin", charset="UTF-8"' },
  })
}

export function proxy(request: NextRequest) {
  const esperada = process.env.ADMIN_PASSWORD

  // Sin contraseña configurada nadie entra. Un deploy mal configurado tiene que
  // dejar la puerta cerrada, no abierta de par en par.
  if (!esperada) {
    return new NextResponse('ADMIN_PASSWORD no está configurada.', { status: 503 })
  }

  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return pedirCredenciales()

  let usuario = ''
  let clave = ''
  try {
    const plano = atob(header.slice(6))
    // Solo el primer ":" separa: una contraseña puede tener los que quiera.
    const corte = plano.indexOf(':')
    if (corte === -1) return pedirCredenciales()
    usuario = plano.slice(0, corte)
    clave = plano.slice(corte + 1)
  } catch {
    return pedirCredenciales()
  }

  // Las dos comparaciones corren siempre, sin cortar en la primera que falle.
  const okUsuario = igualEnTiempoConstante(usuario, USUARIO)
  const okClave = igualEnTiempoConstante(clave, esperada)
  if (!okUsuario || !okClave) return pedirCredenciales()

  return NextResponse.next()
}

// `/admin` a secas y todo lo que cuelgue: `:path*` matchea cero o más segmentos.
//
// `/live/admin.html` es un archivo estático de `public/`, y el proxy igual lo
// intercepta: así el panel de la dinámica queda detrás de la misma clave, y un
// `fetch` same-origin desde esa página viaja con las credenciales que el
// navegador ya guardó — sin tokens ni contraseñas dando vueltas en JS.
//
// `/api/admin/*` es un namespace y no un método sobre `/api/problemas` a
// propósito: el POST de esa ruta tiene que seguir público, es como envía el
// wizard de /recolectar. Hacer que el proxy distinga por método es la clase de
// condición que un día se escribe al revés y abre lo que quería cerrar. Acá la
// regla no tiene excepciones: todo lo que cuelga de /api/admin pide credenciales.
export const config = {
  matcher: ['/admin', '/admin/:path*', '/live/admin.html', '/api/admin/:path*'],
}
