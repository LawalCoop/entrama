-- Las organizaciones que van al encuentro de Rosario.
--
-- Salen del tablero de inscripción
-- (alimentoscooperativos.com.ar/somos/tablero_rosario.php), que son 101
-- personas anotadas. Ese tablero es un formulario de texto libre, así que lo
-- que llegó no se pudo cargar tal cual. Tres cosas se limpiaron antes:
--
-- 1. **Acentos rotos.** Seis nombres venían con UTF-8 guardado como Latin-1
--    ("Coop. Turba AgroecologÃ­a"). Se reconvirtieron.
--
-- 2. **Celdas con varias organizaciones.** Siete personas anotaron más de una
--    en el mismo campo ("La Correntosa / Lawal / FACTTIC"). Se separaron, para
--    que cada una aparezca sola en el desplegable y se pueda elegir.
--
-- 3. **El mismo nombre escrito de varias formas.** COTRAAVI llegó de cuatro
--    maneras distintas; Turba, Alimentando y el Ministerio de Infraestructura,
--    de tres o dos. El índice único por `slug` no las junta —difieren en más
--    que mayúsculas y acentos— y para `asignar_equipo` serían organizaciones
--    distintas: dos personas de Turba caerían en el mismo grupo, que es
--    justamente lo que el reparto trata de evitar.
--
-- Quedaron 79 de las 93 formas distintas que traía el tablero. Se descartaron
-- además tres que no identifican a nadie ("Cooperativa", "Mutual", "Una chica
-- con un emprendimiento de comida"): con el alta abierta, quien puso eso
-- escribe el suyo al anotarse.
--
-- El listado no pretende ser definitivo. La dinámica da de alta las que
-- falten, y el tab de Cooperativas del admin permite corregir y desactivar.

insert into public.cooperativas (nombre) values
  ('Activate'),
  ('Alimentos Cooperativos'),
  ('Almacén Raíces'),
  ('BALAGUER'),
  ('Caminando hacia el futuro'),
  ('Caritas'),
  ('Caritas argentina'),
  ('Catedra Sociologia Rural -FCA UNR'),
  ('Cauqueva'),
  ('CECOPAF'),
  ('CEUR CONICET'),
  ('Chacra rebrote'),
  ('COLECTAR ONG'),
  ('Coop La Wiphala'),
  ('Coop. Agrop. Uruguay Costa Ltda.'),
  ('Cooperativa Agropecuaria y Artesanal "Unión Quebrada y Valles" Ltda'),
  ('Cooperativa Alimentos Coop Chile'),
  ('Cooperativa Buen Vivir'),
  ('Cooperativa COTRAAVI Ltda.'),
  ('Cooperativa Cuchiyaco'),
  ('Cooperativa de Trabajadores Rurales Unidos'),
  ('Cooperativa de Trabajadores y Trabajadoras de la Tierra de Pueblo Esther Ltda.'),
  ('Cooperativa de Trabajo Agrícola Lealtad y Compromiso ltda.'),
  ('Cooperativa de Trabajo Alimentando'),
  ('Cooperativa de Trabajo Arraigo Limitada'),
  ('COOPERATIVA DE TRABAJO DE INVESTIGACION, DESARROLLO Y PRODUCCION FUNGICAN LIMITADA'),
  ('Cooperativa de trabajo Ecomedios Ltda.'),
  ('Cooperativa de Trabajo Elaborar Ltda.'),
  ('Cooperativa de Trabajo Nuestra América Ltda.'),
  ('Cooperativa de Trabajo Turba Agroecología'),
  ('Cooperativa de trabajo Zavalla Santa Fe Limitada'),
  ('Cooperativa Dulce Esperanza'),
  ('Cooperativa Germinar'),
  ('Cooperativa Lactea Tierra del Fuego'),
  ('Cooperativa Macollando'),
  ('Cooperativa Raíz Serrana'),
  ('Cooperativa Villa Giardino Servicios Públicos'),
  ('Coopexpress'),
  ('COOPTEPOR'),
  ('CPO Consumo Popular Organizado'),
  ('Cuidadores de la Casa Comun'),
  ('Cátedra Libre de Soberanía Alimentaria'),
  ('EESO 430 NACIONAL N°1'),
  ('Escuela Agrotécnica Libertador Gral. San Martín'),
  ('Escuela N°430'),
  ('FACTTIC'),
  ('Facultad de Agronomía UBA (FAUBA)'),
  ('Federación de Cooperativas Federadas FECOFE'),
  ('Federación de Mutuales del Chubut'),
  ('Femoba'),
  ('FPDS'),
  ('FUNCAT — Federación Unión Nacional de Cooperativas Argentinas de Trabajo'),
  ('Fundación Cultivo Ecológico'),
  ('Galaxias refugios agroecologicos'),
  ('Galaxias UNICAM SURI MOCASE MNCI'),
  ('Hevale'),
  ('INTA'),
  ('INTA IPAF Region Pampeana'),
  ('Kaiken cultivo natural'),
  ('La Correntosa'),
  ('Lawal'),
  ('Ministerio de Infraestructura de la Provincia de Buenos Aires'),
  ('Movimiento Nacional Campesino Indigena'),
  ('Municipalidad de parana'),
  ('Municipalidad de Pérez'),
  ('Municipalidad de Rosario'),
  ('Mutual red yafutun'),
  ('Naturaleza viva'),
  ('nueva cotar'),
  ('Obispado merlo-Moreno'),
  ('Producción de alimentos el tepeyac'),
  ('REPACA'),
  ('Sembrado libertad'),
  ('Somos Red'),
  ('STS Rosario'),
  ('Sumatoria'),
  ('Unidos San Nicolas'),
  ('Unión de usuarios y consumidores filial villa María'),
  ('UNR')
-- `slug` es una columna generada con índice único, así que esto se puede correr
-- de nuevo sin duplicar: lo que ya está se saltea. Tampoco pisa el nombre que
-- haya cargado alguien antes, que puede estar más cuidado que el del tablero.
on conflict (slug) do nothing;

update app_info set value = '6' where key = 'schema_version';
