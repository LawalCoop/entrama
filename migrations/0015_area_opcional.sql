-- /recolectar deja de preguntar el área.
--
-- El paso 2 preguntaba "¿En qué área trabajás?" —Producción, Logística,
-- Administración, Comunicación, Ventas— y quedaba justo al lado del paso 1, que
-- desde la 0013 pregunta las actividades de la organización. Son cosas
-- distintas: una es dónde está el problema y la otra qué hace la organización.
-- Pero suenan parecido, se solapan en una opción (Ventas / Comercialización), y
-- ocupaban un paso entero cada una. Se decidió sacar el área.
--
-- La columna se queda. Las filas que ya están tienen su área cargada y tirarla
-- perdería ese dato sin ganar nada; solo deja de ser obligatoria.
--
-- Ojo con esto al leer después: `area` va a tener datos hasta el 2026-08-20 y
-- vacío de ahí en adelante. Quien agrupe por área va a ver solo las viejas y le
-- va a parecer que algo se rompió.
alter table public.problemas
  alter column area drop not null;

update app_info set value = '15' where key = 'schema_version';
