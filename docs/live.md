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

Para actualizar desde upstream: copiar los archivos nuevos y volver a aplicar
esos tres cambios. `index.html` e `informe-2025.html` no tienen ninguno, así que
esos se copian y listo.

## El esquema

Está en `migrations/0003_facttic.sql`, o sea que viaja versionado con el repo y
se aplica solo en el build, igual que el resto. Salió del dump del 2026-08-19,
que era una reconstrucción y no un `pg_dump` fiel: los tipos, la nulabilidad y la
foreign key son fieles; los defaults y los nombres de constraints, la
reconstrucción más probable.

Cinco tablas: `facttic_equipos` (6 filas), `facttic_cooperativas` (51),
`facttic_participantes` (vacía), `facttic_config` (el timer) y `facttic_admin`
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
