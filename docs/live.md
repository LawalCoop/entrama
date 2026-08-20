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
8. **La asignación de equipo es automática** al anotarse, y el registro pide
   provincia, tipo de organización y actividades. Ver más abajo.
9. **Un equipo cerrado se puede reabrir** desde el dashboard del admin. Ver más
   abajo.
10. **El botón Atrás del navegador funciona**: las pantallas de `dinamica.html`,
    los slides del deck y los tabs del admin apilan historial. Ver más abajo.

Para actualizar desde upstream: copiar los archivos nuevos y volver a aplicar
esos diez cambios. De `index.html` solo el `history: true`; `informe-2025.html`
no tiene ninguno, así que ese se copia y listo.

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

## De dónde viene el código

De `hg1g/facttic-para-armar`, que es de FACTTIC — la misma gente que trabaja en
esto. No es código de terceros: por eso se copió, se modificó y se publicó sin
más trámite.

El repo de origen no declara licencia. Para nosotros no cambia nada, pero
agregarle un LICENSE ayudaría a cualquier otra cooperativa que quiera reusar la
dinámica y hoy no tiene cómo saber si puede.

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

Del lado de la dinámica eso no llegaba a pasar nunca: el formulario validaba que
la organización estuviera en el catálogo y cortaba si no, así que
`registrarCooperativa` sólo se ejecutaba con nombres que ya existían. Esa
validación se sacó. Al encuentro va gente cuya organización puede no estar
cargada, y dejarla afuera del formulario es peor que un catálogo con algún
duplicado; el desplegable sigue sugiriendo, que es lo que evita que cada quien
escriba el mismo nombre a su manera.

**La precarga.** `migrations/0006_organizaciones_rosario.sql` trae las 79
organizaciones del tablero de inscripción del encuentro de Rosario. Ese tablero
es un formulario de texto libre, así que lo que llegó no se pudo cargar tal
cual: seis nombres traían los acentos rotos (UTF-8 guardado como Latin-1), siete
personas habían anotado varias organizaciones en el mismo campo, y varias
llegaron escritas de más de una forma —COTRAAVI, de cuatro—. Eso último importa
más de lo que parece: el índice único por `slug` no junta esas variantes, y para
`asignar_equipo` serían organizaciones distintas, con lo cual dos personas de la
misma casa podrían caer en el mismo equipo. La migración documenta cada
decisión.

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
## La asignación automática de equipo

Al anotarse ya salís con equipo: la pantalla de confirmación aparece de una, con
el color del que te tocó. Cambiar de equipo sigue estando —el botón lleva a la
misma lista de siempre, con las sugerencias de balanceo que ya había.

Antes cada quien elegía tema de una lista. Los equipos terminaban armados por
quién llegó primero: los primeros temas se llenaban, y la sugerencia de moverse
aparecía recién después de elegir, cuando ya habías leído el que querías.

### Qué se pregunta ahora

Además de nombre y organización: **provincia**, **tipo de organización** y
**actividad** (esta admite varias). Los tres viven en `facttic_participantes`,
no en el catálogo `cooperativas`: ese catálogo es público, editable y compartido
con `/recolectar`, así que un dato equivocado ahí se propagaría a todas las
personas de esa organización.

Para que no haya que tipearlo una vez por persona, el formulario autocompleta
desde alguien de la misma organización que ya se haya anotado. Falla en
silencio: si no anda, los campos quedan vacíos y se completan a mano.

Los tres niveles del Estado (municipal, provincial, nacional) se guardan por
separado para poder leer después quién vino, pero a la hora de mezclar cuentan
como uno solo. Eso lo resuelve `familia_organizacion`, una columna generada que
agrupa por el prefijo `estado-`. **Si se agrega un nivel nuevo, respetar ese
prefijo**, o va a contar como un tipo aparte.

### Por qué el algoritmo vive en Postgres

Está en `asignar_equipo`, en `migrations/0005_asignacion_automatica.sql`.

En el navegador no serviría: al arrancar la actividad se anota todo el mundo
casi a la vez, y si cada cliente se trae la foto de la base, calcula y después
inserta, todos ven el mismo equipo como "el más vacío" y se amontonan ahí. La
función toma un `pg_advisory_xact_lock`, así que cada asignación decide viendo
ya sumada a la anterior.

No es `security definer`: leer equipos y participantes e insertar un
participante es lo que anon ya puede hacer. Tampoco es una barrera —con la anon
key uno puede insertarse donde quiera, igual que antes—: ordena la asignación,
no la custodia.

### Cómo elige

Le pone puntaje a cada equipo activo y se queda con el más bajo. Los pesos están
arriba de la función y se leen como "cuántas personas de diferencia tolero con
tal de no repetir esto":

| Criterio | Peso |
|---|---|
| Cada persona ya en el equipo | 10 |
| Cada una de la misma organización | 25 |
| Cada una de la misma familia de organización | 6 |
| Cada una que comparta alguna actividad | 4 |
| Cada una de la misma provincia | 2 |

Con estos números, a igualdad de tamaño manda la diversidad; con dos personas de
diferencia manda el tamaño. Ese orden es deliberado: equipos parejos primero,
variados después. Para que queden más variados a costa de tamaños dispares, subir
los de diversidad; para lo contrario, subir el de tamaño.

Los empates se rompen al azar. Sin eso, con la base vacía las primeras personas
empatan en cero y caen todas en el mismo equipo, porque el orden que devuelve
Postgres es estable.

Simulado con 101 personas —los inscriptos al encuentro de Rosario— sobre 5
equipos: 20, 20, 21, 20 y 20, ninguna organización repetida, los 5 tipos y las 8
provincias del simulacro presentes en cada equipo. Con 10 personas de una sola
organización y 6 equipos —donde repetir es inevitable— reparte 2/2/2/2/1/1.

### Lo que no hace

**No rebalancea.** Asigna a quien llega mirando cómo viene el reparto hasta ese
momento; no mueve a nadie después. Si las primeras diez personas son todas de la
misma provincia, esa provincia ya quedó repartida entre los equipos y las que
lleguen después no lo corrigen.

**No reasigna a quien ya tiene equipo.** Volver a entrar desde el mismo
dispositivo te devuelve a tu equipo, no a uno nuevo: si no, refrescar la página
te movería de grupo en medio de la charla.

**La provincia pesa poco y no estaba entre los criterios pedidos.** Se pide como
dato y se usa con peso 2, el más bajo, para desempatar. Si no tiene que influir,
alcanza con ponerlo en 0.

## Reabrir un equipo

Un equipo que cerró vuelve a "En progreso" desde el botón **↩ Reabrir**, en su
tarjeta del dashboard del admin.

**Reabrir no borra nada.** La reflexión y los accionables quedan donde estaban,
así que el equipo retoma desde donde dejó. Por eso el botón tampoco pide
confirmación, y volver a cerrar es enviar el cierre otra vez.

Eso obligó a guardar el estado en vez de deducirlo. Antes "cerrado" era una
condición calculada —tener `reflexion` y `accionables` cargados— y con ese
modelo la única forma de reabrir era borrarle al equipo lo que había escrito.
Ahora hay una columna `cerrado` en `facttic_equipos`
(`migrations/0008_equipo_cerrado.sql`), y la migración deja en `true` a los que
ya habían cerrado: si no, un plenario en curso vería todos sus equipos volver a
"En progreso" de golpe al deployar.

El cambio llega a los celulares por realtime: a quien esté mirando la pantalla
de "¡Listo!" lo devuelve a la de su equipo, y al revés si lo vuelven a cerrar.
Sólo se mueve entre esas dos pantallas —si alguien está escribiendo el cierre,
no se le saca de encima lo que estaba tipeando.

### El cierre lo marca la base, no el navegador

`cerrado` lo seteaba el cliente, mandándolo junto con la reflexión. Eso falla con
la app abierta, y en esta app la app está abierta: durante la actividad la gente
tiene la pantalla puesta desde el principio, y un deploy no les cambia el
JavaScript hasta que recarguen. Pasó en vivo el 2026-08-20: un equipo mandó su
cierre desde una pestaña anterior al deploy, se guardaron la reflexión y los
accionables, `cerrado` quedó en false, y el panel lo siguió mostrando "En
progreso" mientras en el celular decía "¡Listo!".

Pedirle a cien personas que recarguen no es un plan, así que ahora lo deduce un
trigger (`migrations/0009_cerrar_en_la_base.sql`): si un update deja una
reflexión con texto, el equipo queda cerrado, sin importar qué versión tenga
quien lo mandó.

El trigger no pisa una reapertura. Sólo actúa cuando el update **no** habla de
`cerrado` —"Reabrir" manda `cerrado = false` y nada más— y cuando la reflexión o
los accionables cambiaron de verdad, para que editarle el nombre o el color a un
equipo reabierto no lo vuelva a cerrar.

Queda un caso afuera: reabrir y reenviar el cierre **sin cambiarle una coma**.
Ahí no cambia nada que el trigger pueda mirar. Es raro —si lo reabrieron es para
tocar algo— y los clientes actualizados lo cubren igual, porque mandan `cerrado`
ellos mismos.

### De paso, un flag que no servía

La pantalla que veía cada participante al volver a entrar salía de
`participantes.terminado`, y **nada en el código ponía nunca ese campo en
`true`**: quien cerraba y recargaba volvía a la pantalla de su equipo como si no
hubiera cerrado. Ahora sale de `equipos.cerrado`, que además es lo correcto —el
cierre es del equipo, no de cada persona—. La columna `terminado` sigue en la
tabla y el admin la muestra, pero nadie la escribe.

## El botón Atrás

Antes no hacía nada útil en ninguna pantalla del live: las pantallas se cambian
prendiendo una clase CSS y los tabs igual, así que para el navegador nunca pasaba
nada. `history.length` se quedaba en 1 y Atrás —o el gesto de deslizar desde el
borde, que en celular es lo mismo y la gente hace por reflejo— sacaba de la app
en vez de volver un paso.

El deck era el caso engañoso: reveal estaba con `hash: true`, así que la URL
mostraba el slide (`#/3`) y parecía que el historial se llenaba. Pero `hash: true`
sin `history: true` usa `replaceState`, que pisa la entrada actual en vez de
agregar una.

Ahora:

| | Cómo |
|---|---|
| `index.html` | `history: true` en `Reveal.initialize` |
| `dinamica.html` | `mostrarPantalla` apila; `popstate` devuelve |
| `admin.html` | `cambiarTab` apila con hash; `popstate` devuelve |

**La dinámica no toca la URL.** Podría poner `#pantallaCierre`, pero qué pantalla
corresponde no lo decide la dirección sino el estado —si ya te anotaste, si tu
equipo cerró— así que un hash podría mentir, y al recargar habría que decidir a
quién creerle. Sin hash, recargar se comporta como antes de este cambio.

**El admin sí usa hash**, al revés, porque un tab no depende de ningún estado:
la URL no puede mentir. De paso quedan enlazables — `admin.html#conexiones` abre
ese tab directo.

**Volver no deshace nada.** Si ya te anotaste seguís anotado; si tu equipo cerró,
sigue cerrado. Es lo mismo que hace el botón "Cambiar de equipo", que ya existía.

Tres detalles de los que depende que funcione, y que salieron de probarlo:

**La primera pantalla reemplaza la entrada de carga, no apila una nueva.** Si
apilara, la entrada original quedaría sin `state`, y al volver hasta ella
`popstate` dispararía con `state` en null: la posición del historial se movería y
la pantalla no. El síntoma es un Atrás que no hace nada visible, y recién el
siguiente sale de la app.

**En `cambiarTab` la validación va antes de apagar los tabs.** Si primero apagara
todos y después abortara por un hash inventado, el panel quedaría sin ninguno
activo, o sea en blanco.

**Durante `init()` los cambios de pantalla reemplazan, no apilan.** El arranque
puede mover de pantalla al resolver el estado —quien ya se anotó entra directo a
la de su equipo— y eso no es navegación de nadie. Apilándolo, esa persona
arrancaba con una entrada de más y su primer Atrás la mandaba al registro, una
pantalla que nunca había visto en esa visita. La bandera baja en un `.finally`
porque `init()` tiene un return temprano si falla la conexión.
