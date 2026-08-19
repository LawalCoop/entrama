# facttic-para-armar

Copia literal de https://github.com/hg1g/facttic-para-armar, servida en /live.

- Commit: `cf0f59127bba47c4366c230145651b737d4af2ac` ("fijar la fecha del plenario en el informe congelado")
- Fecha del commit: 2026-08-19
- Copiado el: 2026-08-19

## Qué hay acá

| Archivo | Qué es | Backend |
|---|---|---|
| `index.html` | Slide deck (reveal.js) de la Encuesta FACTTIC 2025 | ninguno |
| `dinamica.html` | Dinámica en vivo del plenario, con realtime. Es lo que sirve `/live`. | Supabase de FACTTIC |
| `admin.html` | Panel para conducir la dinámica | Supabase de FACTTIC |
| `informe.html` | Informe del debate, en vivo | Supabase de FACTTIC |
| `informe-2025.html` | El mismo informe, congelado | ninguno |

## Cosas que conviene saber

**Esto es una foto, no un enlace.** Si el repo de origen cambia, esta copia no se
entera. Actualizar es volver a copiar los archivos y anotar el commit nuevo acá.

**No lo edites acá.** Cualquier cambio se pierde en la próxima copia, y además el
código es de otro proyecto. Lo que haya que cambiar va aguas arriba.

**Depende de un Supabase que no es nuestro.** Las páginas `dinamica`, `admin` e
`informe` hablan con el proyecto `aziyyqvupqaexdzmumvl` de FACTTIC, con la clave
anon embebida en el HTML. Si esa base se cae o rota las claves, esas tres
pantallas dejan de andar y desde este repo no hay nada que hacer. `index.html` e
`informe-2025.html` no dependen de nada y andan siempre.

**Carga librerías de jsDelivr.** reveal.js y supabase-js vienen de CDN, así que
esas pantallas necesitan internet.

**El repo de origen no declara licencia.** Antes de publicar esto conviene tener
el permiso de sus autores por escrito, o que agreguen un LICENSE.
