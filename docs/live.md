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
| `dinamica.html` | Dinámica en vivo, con realtime. Es lo que sirve `/live`. | nuestro Supabase |
| `admin.html` | Panel para conducir la dinámica | nuestro Supabase |
| `informe.html` | Informe del debate, en vivo | nuestro Supabase |
| `informe-2025.html` | El mismo informe, congelado | ninguno |

Los tres del medio están con la marca de **Alimentos Cooperativos** (ver más
abajo). `index.html` e `informe-2025.html` siguen siendo de FACTTIC: son
contenido histórico —la Encuesta 2025 y el informe del plenario— y rebrandearlos
los volvería engañosos.

## Ya no es una copia literal

Al principio estos archivos eran idénticos al repo de origen. Dejaron de serlo
cuando la dinámica pasó a correr sobre nuestra base. Los cambios son seis, y
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
6. **La marca es Alimentos Cooperativos**, no FACTTIC. Ver más abajo.
7. **Un tab "Problemas"** con lo recolectado en `/recolectar`, y `admin.html`
   pasa a estar detrás del Basic Auth de `proxy.ts`. Ver más abajo.

Para actualizar desde upstream: copiar los archivos nuevos y volver a aplicar
esos siete cambios. `index.html` e `informe-2025.html` no tienen ninguno, así
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
## La marca

La dinámica se usa para Alimentos Cooperativos (alimentoscooperativos.com), así
que `dinamica.html`, `admin.html` e `informe.html` llevan esa marca, y abajo un
pie "Powered by Lawal y FACTTIC".

**El contenido de la actividad se edita desde el panel, no desde el repo.** Los
equipos y sus preguntas se cargan en el tab de Equipos de `admin.html`, y cambian
de una actividad a la siguiente. Al 2026-08-20 no son los seis ejes del plenario
FACTTIC 2025: se reemplazaron al preparar la actividad siguiente.

Esos seis originales, con sus temas y preguntas, siguen en
`migrations/0003_facttic.sql`. Están ahí como la semilla con la que arrancó la
base, no como el estado actual: la migración ya se aplicó y no se vuelve a
correr, así que editarla no cambia nada en producción.

Las cooperativas siguen el mismo camino, y además el catálogo es compartido (ver
arriba): crece solo con lo que se escribe acá y en `/recolectar`.

Lo que cambió, además de los textos:

- **El acento pasó de azul (`#3b82f6`) a verde (`#6ba54a`)**, que es el primario
  del sitio de Alimentos Cooperativos. En `dinamica.html` es solo el valor por
  defecto de `--equipo-actual`: en cuanto alguien elige un equipo, el JS lo pisa
  con el color de ese equipo.
- **En el informe imprimible el verde va oscurecido a `#4e7d33`.** Ese informe
  se imprime sobre blanco, y el verde de marca contra blanco da 2.96:1, por
  debajo del mínimo legible; el oscurecido da 4.88:1. Sobre el fondo oscuro de
  la app el de marca da 6.04:1 y se usa tal cual.
- **El logo del informe imprimible andaba roto.** Apuntaba a un `.png` de
  `facttic.org.ar` que hoy da 404. Ahora sale de `public/live/`, con URL
  absoluta armada con `location.origin`: esa ventana se llena con
  `document.write` sobre `about:blank`, donde una ruta relativa no resuelve.

### Los logos

Cada logo está en dos versiones, y cada pantalla usa la que contrasta con su
fondo:

| Fondo oscuro | Fondo claro |
|---|---|
| `logo_alimentos_claro.png` | `logo_alimentos_oscuro.png` |
| `logo_lawal_claro.png` | `logo_lawal_oscuro.png` |
| `logo_facttic.png` (el de upstream) | `logo_facttic_oscuro.png` |

Dos archivos y no uno con `filter: invert()` porque el texto de cada logo es de
un tono solo, pero las hojas del de Alimentos Cooperativos y las barras de
colores de los tres no lo son: invertir daría vuelta también eso, que es
justamente la marca. Las versiones nuevas se generaron recoloreando únicamente
los píxeles acromáticos, así que el color quedó intacto.

Dónde importan las dos versiones: la **vista proyectable** de `admin.html` tiene
un switch de modo claro, así que ahí conviven las dos y el CSS muestra una u
otra. Un detalle a tener en cuenta si se toca ese CSS: las reglas que las
esconden van **después** de `.pie-marca img` y nombran el elemento
(`img.logo-en-claro`), porque si no pierden en especificidad contra el
`display: block` de ahí arriba y los dos logos se dibujan encimados.

También se sacó la pastilla oscura que el modo claro le ponía detrás al logo del
encabezado: existía porque el logo de FACTTIC es de trazo blanco y sin ella se
perdía. Ahora que hay una versión por fondo, sobra.

El pie de marca no va en todas las pantallas de `dinamica.html`: las de
confirmación y "listo" se pintan con el color del equipo elegido, que puede ser
cualquiera de los seis, y ahí ni el gris del texto ni los logos tienen un
contraste que se pueda garantizar. Va en las tres que usan el fondo de la app
—registro, selección de equipo y cierre— y en la vista proyectable, que es la
única pantalla del admin que ve la sala.

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
