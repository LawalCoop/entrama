# facttic-para-armar

Copia de https://github.com/hg1g/facttic-para-armar, servida en /live.

- Commit de origen: `cf0f59127bba47c4366c230145651b737d4af2ac`
  ("fijar la fecha del plenario en el informe congelado", 2026-08-19)
- Copiado el: 2026-08-19
- Migrado a nuestra base el: 2026-08-20

## Qué hay acá

| Archivo | Qué es | Backend |
|---|---|---|
| `index.html` | Slide deck (reveal.js) de la Encuesta FACTTIC 2025 | ninguno |
| `dinamica.html` | Dinámica en vivo del plenario, con realtime. Es lo que sirve `/live`. | nuestro Supabase |
| `admin.html` | Panel para conducir la dinámica | nuestro Supabase |
| `informe.html` | Informe del debate, en vivo | nuestro Supabase |
| `informe-2025.html` | El mismo informe, congelado | ninguno |

## Ya no es una copia literal

Al principio estos archivos eran idénticos al repo de origen. Dejaron de serlo
cuando la dinámica pasó a correr sobre nuestra base. Los cambios son tres, y
están acotados a propósito para que la próxima actualización desde upstream siga
siendo manejable:

1. **`SUPABASE_URL` y `SUPABASE_KEY`** apuntan a nuestro proyecto
   (`niiflnildmljjcgkqmwd`) en vez de al de FACTTIC (`aziyyqvupqaexdzmumvl`).
2. **Los nombres de tabla** llevan prefijo `facttic_`, tanto en los `.from()`
   como en el `table:` de las suscripciones de realtime.
3. **El login de `admin.html`** usa `rpc('facttic_verificar_admin', ...)` en vez
   de `select('admin_password')`.
4. **Un contador de conexiones persistentes**: `dinamica.html` y `admin.html` se
   registran en el canal de presence `facttic-conexiones`, y `admin.html` tiene
   un tab "Conexiones" que las muestra. Ver más abajo.
5. **El catálogo de cooperativas es compartido con Entrama**: la tabla se llama
   `cooperativas` (sin prefijo) y `dinamica.html` da de alta las que no estaban.
   Ver más abajo.
6. **Un tab "Problemas"** con lo recolectado en `/recolectar`, y `admin.html`
   pasa a estar detrás del Basic Auth de `proxy.ts`. Ver más abajo.

Para actualizar desde upstream: copiar los archivos nuevos y volver a aplicar
esos seis cambios. `index.html` e `informe-2025.html` no tienen ninguno, así
que esos se copian y listo.

## El esquema

Está en `migrations/0003_facttic.sql`, o sea que viaja versionado con el repo y
se aplica solo en el build, igual que el resto. Salió del dump del 2026-08-19,
que era una reconstrucción y no un `pg_dump` fiel: los tipos, la nulabilidad y la
foreign key son fieles; los defaults y los nombres de constraints, la
reconstrucción más probable.

Cinco tablas: `facttic_equipos` (6 filas), `cooperativas` (51),
`facttic_participantes`, `facttic_config` (el timer) y `facttic_admin`
(la contraseña del panel).

**Los participantes del plenario 2025 no están.** El dump los excluyó por ser
datos personales.

## La contraseña del panel

`facttic_admin.password` arranca en `null`, y `facttic_verificar_admin` rechaza
todo mientras siga así: una migración corrida y olvidada deja el panel cerrado,
no abierto. Para habilitarlo:

```sql
update facttic_admin set password = 'la-que-sea' where id = 1;
```

Anon no puede leer ni escribir esa tabla —RLS activo sin policies, más un revoke
explícito— y la función es `security definer`, así que compara adentro de
Postgres y al browser solo le vuelve `true` o `false`.

Antes no era así: `admin.html` hacía `select('admin_password')` y comparaba en
JavaScript, o sea que cualquiera con la consola abierta la leía en dos líneas.

## Lo que esto NO resuelve

**Anon puede escribir las cuatro tablas de la dinámica.** Y tiene que poder: los
participantes se anotan sin login, así que `insert`/`update` en
`facttic_participantes` y `facttic_equipos` están abiertos. Como el panel de
admin usa la misma anon key —el mismo rol de Postgres— ninguna policy puede
distinguir al que conduce del que participa. En la práctica: alguien con la
consola abierta puede mover el timer o editar un equipo sin saber la contraseña.

Cerrarlo requiere que las 14 escrituras de `admin.html` pasen por funciones
`security definer` que reciban la contraseña, o auth de verdad con Supabase Auth.
Se decidió no hacerlo por ahora.

## Realtime

Las cuatro tablas están en la publicación `supabase_realtime`. Sin eso el cliente
se suscribe, no da error, y no llega ningún evento.

No hace falta `replica identity full`: los callbacks de la app ignoran el payload
del evento y recargan la tabla entera con un `select`. El evento es solo un
"algo cambió". Por eso también importa que las policies de `select` existan: sin
lectura no hay evento, y la recarga tampoco andaría.

## Licencia

El repo de origen no declara licencia. Antes de tratar esto como propio conviene
tener el permiso de sus autores, o que agreguen un LICENSE.

## El tab de Conexiones

Realtime tiene un techo de conexiones concurrentes por proyecto (Free ~200, Pro
500; el número de tu plan está en el dashboard). Pasado ese punto las conexiones
nuevas se rechazan, o sea que la dinámica se cae para quien llegue último —
justo cuando más gente está entrando.

Ese contador no se puede consultar: el endpoint de salud de Realtime está cerrado
en Supabase hosted (da 401 o 500 con anon key y con service_role), y la
Management API pide un token que no puede vivir en un HTML estático.

Así que lo contamos nosotros con Presence, y no es una estimación: lo único que
abre conexiones contra Realtime en este proyecto son `dinamica.html` y
`admin.html`, y las dos se registran. `informe.html` no abre ninguna — hace dos
`select` y nada más.

Dos detalles que importan para que el número sea el correcto:

**La clave de presence es por pestaña, no por dispositivo.** Cada pestaña
mantiene su propio WebSocket y ocupa su propio lugar en la cuota, así que dos
pestañas de la misma persona tienen que contar dos.

**Los cuatro canales de `dinamica.html` son una sola conexión.** supabase-js
multiplexa todos los canales de un cliente sobre el mismo socket, así que sumar
`facttic-conexiones` no agrega una conexión.

El umbral vive en `LIMITE_CONEXIONES`, arriba de la lógica en `admin.html`.
Verde hasta el 60%, ámbar hasta el 90%, rojo de ahí en adelante.

**Lo que no cuenta:** si algún día otra app usa este mismo proyecto de Supabase
con realtime, sus conexiones gastan cuota y no aparecen acá. Y una conexión que
muere tarda unos segundos en desaparecer, hasta que vence el heartbeat.

## El catálogo de cooperativas

`cooperativas` no lleva prefijo porque dejó de ser de la dinámica: la comparte
con `/recolectar` de Entrama. Nació como `facttic_cooperativas` y la renombró
`migrations/0004_cooperativas.sql`. Una sola lista, y lo que se escribe en un
lado sugiere en el otro.

Tiene una columna `slug` **generada por Postgres**, con índice único:

```sql
slug text generated always as (
  lower(trim(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')))
) stored
```

Generada y no calculada por quien inserta: si la computaran los clientes,
`dinamica.html` y el backend de Entrama tendrían que coincidir en cómo se
normaliza, y el día que uno cambie aparecen duplicados que nadie entiende. Se usa
`translate` y no `unaccent` porque unaccent es una extensión que puede no estar
instalada, y esto tiene que correr igual en PGlite local.

Con eso "CALF", " calf " y "Calf" son la misma fila. "Coop. CALF" no: eso ya es
otro nombre, y adivinar que son la misma sería inventar.

Las altas usan `on conflict (slug) do nothing`, así que quien llega segundo no
pisa el nombre que puso el que la creó.

**Dónde se da de alta:** en `dinamica.html` al anotarse (`registrarCooperativa`)
y en Entrama al enviar un problema (`POST /api/problemas`). En los dos casos
falla en silencio: la persona ya quedó anotada o su problema ya se guardó, y el
catálogo es una mejora para el que venga después, no parte de la operación.

En Entrama el alta ocurre **al enviar y no al tipear**, para no llenar el
catálogo con lo que alguien escribió a medias y borró.

**Lo que esto abre:** `/recolectar` es público y sin rate limit, así que una
cooperativa nueva escrita ahí aparece enseguida en el desplegable de la dinámica.
Se decidió así a sabiendas. La palanca para bajar una es el campo `activa`, que
la dinámica filtra y el tab de Cooperativas del admin ya edita.

## El tab de Problemas

Muestra lo que la gente carga en `/recolectar`, que es otra app y otra tabla.

Esos datos **no salen de Supabase con la anon key**: `problemas` tiene RLS sin
policies justamente para que los aportes no sean públicos, y abrirle lectura a
`anon` los dejaría accesibles a cualquiera que mire el HTML — la anon key está
ahí adentro.

Salen de `GET /api/admin/problemas`, un endpoint de Entrama que `proxy.ts`
protege con la misma `ADMIN_PASSWORD` que `/admin`. Y `/live/admin.html` también
entró al matcher del proxy, así que el navegador ya tiene las credenciales
guardadas y las manda solas en un `fetch` same-origin: no hay token ni
contraseña dando vueltas en el JS.

**Por qué `/api/admin/` y no un GET sobre `/api/problemas`:** el POST de esa ruta
tiene que seguir público, es como envía el wizard de `/recolectar`. El proxy
protege por ruta y no por método, así que meter toda la ruta detrás rompería el
wizard, y hacer que el proxy distinga por método es la clase de condición que un
día se escribe al revés y abre lo que quería cerrar. Con un namespace aparte la
regla no tiene excepciones.

**Ahora el panel pide dos claves:** primero el diálogo del navegador
(`ADMIN_PASSWORD`) y después el login propio del HTML
(`facttic_admin.password`). Cada una se pide una vez por sesión. Se dejaron las
dos porque son cosas distintas: una protege la página, la otra el panel.

El texto de cada problema se escapa antes de insertarlo en el DOM: es texto libre
que escribió cualquiera desde un formulario público.
