-- Las que se anotaron al tablero de Rosario después de 0006.
--
-- Ese tablero pasó de 101 a 117 inscripciones. Cruzando la columna de
-- organización contra `cooperativas` quedaron 39 formas sin match exacto, pero
-- 34 eran variantes de escritura de algo ya cargado: COTRAAVI llegó en cuatro
-- formas más, Coopexpress en tres, el Ministerio de Infraestructura en tres,
-- Germinar, Turba, FAUBA, FUNCAT y Pueblo Esther en dos cada una. Dos difieren
-- de lo que hay sólo en el carácter: `Nº` (ordinal masculino) donde 0006 cargó
-- `N°` (símbolo de grado). El `slug` no las junta —normaliza acentos y
-- mayúsculas, no abreviaturas ni ortografía— y no hay nada que decidir ahí: la
-- fila buena ya existe.
--
-- Quedan estas cinco, que son organizaciones que no estaban. De las que
-- llegaron escritas de varias formas se elige una:
--
--   * Redes del Noroeste vino en cuatro grafías, que difieren en el plural, el
--     punto y el acento de Junín.
--   * La Universidad Nacional de Luján, como "Universidad de lujan" y "Unlu".
--
-- No entran tres celdas que no identifican a nadie ("Cooperativa", "Mutual",
-- "Una chica con un emprendimiento de comida"), por el mismo criterio de 0006,
-- ni "Raíces" y "Unidos" a secas: para cada una hay dos o tres filas ya
-- cargadas que podrían ser, y elegir sería adivinar. Quien se anotó así escribe
-- el suyo en la dinámica.

insert into public.cooperativas (nombre) values
  ('Cooperativa Redes del Noroeste Junín'),
  ('Federación AgroBA'),
  -- Hay un 'Chacra El Molino' cargado, que no es esta: la de Los Molinos es
  -- otra organización, no una grafía distinta de aquella.
  ('Los Molinos - Mulini'),
  ('Poliedro, espacio de ideas'),
  ('Universidad Nacional de Luján')
on conflict (slug) do nothing;

update app_info set value = '17' where key = 'schema_version';
