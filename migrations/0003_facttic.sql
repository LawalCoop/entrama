-- La dinámica de FACTTIC, migrada a nuestra base.
--
-- Viene de github.com/hg1g/facttic-para-armar, que hasta ahora hablaba con un
-- Supabase de FACTTIC que no controlamos: si esa base se dormía, /live se
-- quedaba sin datos y desde acá no había nada que hacer. Ahora los datos son
-- nuestros. El esquema sale del dump del 2026-08-19 (ver docs/live.md).
--
-- Todo va prefijado con `facttic_` y no en un schema aparte: un schema propio
-- habría que exponerlo a mano en el dashboard de Supabase —un paso manual que
-- puede fallar callado— y obligaría a cambiar los `schema: 'public'` de las
-- ocho suscripciones de realtime. Con prefijo, `config` y `equipos` tampoco
-- chocan con nombres que quiera usar Entrama más adelante.

-- `anon` es el rol con el que PostgREST atiende a quien no está logueado. Lo
-- crea Supabase, no Postgres, así que en PGlite local no existe y las policies
-- de más abajo fallarían. Esta guarda hace que la misma migración corra igual
-- en los dos lados: en Supabase no hace nada.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

create table if not exists public.facttic_equipos (
    id           uuid primary key default gen_random_uuid(),
    nombre       text        not null,
    tema         text,
    color        text        not null,
    preguntas    text[],
    reflexion    text,
    accionables  text[],
    responsables text[],
    google_doc   text,
    orden        integer     default 0,
    activo       boolean     default true
);

create table if not exists public.facttic_cooperativas (
    id     uuid primary key default gen_random_uuid(),
    nombre text    not null,
    orden  integer default 0,
    activa boolean default true
);

create table if not exists public.facttic_participantes (
    id          uuid primary key default gen_random_uuid(),
    device_id   text        not null,
    nombre      text        not null,
    cooperativa text        not null,
    equipo_id   uuid        references public.facttic_equipos (id),
    terminado   boolean     default false,
    reflexion   text,
    accionables text[],
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

create index if not exists facttic_participantes_device_id_idx on public.facttic_participantes (device_id);
create index if not exists facttic_participantes_equipo_id_idx on public.facttic_participantes (equipo_id);

-- Solo el timer. La contraseña vivía acá y era el problema: el login de
-- admin.html hacía `select admin_password` y comparaba en el browser, así que
-- para preguntarte si sabías la clave primero te la mandaba.
create table if not exists public.facttic_config (
    id                     integer primary key,
    timer_end              timestamptz,
    timer_duration         integer,
    timer_paused           boolean default false,
    timer_paused_remaining integer
);

-- La contraseña, en una tabla que anon no lee nunca (RLS activo, cero policies).
-- Arranca en null a propósito: `facttic_verificar_admin` rechaza todo hasta que
-- alguien la cargue, así que una migración corrida y olvidada deja el panel
-- cerrado en vez de abierto.
create table if not exists public.facttic_admin (
    id       integer primary key,
    password text
);

insert into public.facttic_admin (id, password) values (1, null)
on conflict (id) do nothing;

-- `security definer` es lo que hace que esto funcione: la función corre con los
-- permisos de quien la creó, así que puede leer facttic_admin aunque quien la
-- llama no pueda. El browser manda lo que escribiste y recibe true o false; la
-- contraseña no viaja de vuelta.
create or replace function public.facttic_verificar_admin(pass text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1 from public.facttic_admin
        where id = 1 and password is not null and password = pass
    );
$$;

revoke all on function public.facttic_verificar_admin(text) from public;
grant execute on function public.facttic_verificar_admin(text) to anon;

alter table public.facttic_equipos       enable row level security;
alter table public.facttic_cooperativas  enable row level security;
alter table public.facttic_participantes enable row level security;
alter table public.facttic_config        enable row level security;
alter table public.facttic_admin         enable row level security;

-- Lectura pública de lo que las pantallas muestran. Realtime evalúa RLS con el
-- rol que se suscribe, así que sin esto no llegaría ni un evento.
create policy "facttic: lectura de equipos"       on public.facttic_equipos       for select to anon using (true);
create policy "facttic: lectura de cooperativas"  on public.facttic_cooperativas  for select to anon using (true);
create policy "facttic: lectura de participantes" on public.facttic_participantes for select to anon using (true);
create policy "facttic: lectura del timer"        on public.facttic_config        for select to anon using (true);

-- Escritura abierta a anon, que es lo que la dinámica necesita y también su
-- techo: los participantes se anotan sin login y el panel de admin usa la misma
-- anon key, o sea el mismo rol. Ninguna policy puede distinguirlos. Cerrar esto
-- de verdad requiere que las escrituras del admin pasen por funciones
-- `security definer` con la contraseña; ver docs/live.md.
create policy "facttic: anon escribe participantes" on public.facttic_participantes for insert to anon with check (true);
create policy "facttic: anon edita participantes"   on public.facttic_participantes for update to anon using (true);
create policy "facttic: anon borra participantes"   on public.facttic_participantes for delete to anon using (true);
create policy "facttic: anon escribe equipos"       on public.facttic_equipos       for insert to anon with check (true);
create policy "facttic: anon edita equipos"         on public.facttic_equipos       for update to anon using (true);
create policy "facttic: anon borra equipos"         on public.facttic_equipos       for delete to anon using (true);
create policy "facttic: anon escribe cooperativas"  on public.facttic_cooperativas  for insert to anon with check (true);
create policy "facttic: anon edita cooperativas"    on public.facttic_cooperativas  for update to anon using (true);
create policy "facttic: anon borra cooperativas"    on public.facttic_cooperativas  for delete to anon using (true);
create policy "facttic: anon mueve el timer"        on public.facttic_config        for update to anon using (true);

-- facttic_admin no lleva policies: con RLS activo y ninguna, la API no devuelve
-- nada. La única puerta es la función de arriba.
--
-- Y el revoke explícito, que no es redundante: Supabase define *default
-- privileges* que le dan permisos a anon y authenticated sobre las tablas
-- nuevas de `public`. Sin esto, la tabla quedaría defendida solo por RLS —que
-- alcanza, pero deja la protección dependiendo de una sola cosa. Postgres a
-- secas no hace eso, así que en PGlite local el revoke no cambia nada y en
-- Supabase sí.
revoke all on public.facttic_admin from anon, public;

grant usage on schema public to anon;
grant select, insert, update, delete on public.facttic_equipos, public.facttic_cooperativas, public.facttic_participantes to anon;
grant select, update on public.facttic_config to anon;

-- Realtime. La publicación la crea Supabase; en PGlite no existe, y sin esta
-- guarda la migración se caería en local. Sin `replica identity full` a
-- propósito: los callbacks de la app ignoran el payload y recargan la tabla, así
-- que el default (solo PK) alcanza y no engorda el WAL.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.facttic_equipos, public.facttic_cooperativas, public.facttic_participantes, public.facttic_config';
  end if;
end $$;

-- ---------------------------------------------------------------- datos
-- equipos (6)
insert into public.facttic_equipos (id, nombre, tema, color, preguntas, reflexion, accionables, responsables, google_doc, orden, activo)
  values ('a914821e-0976-44f5-8c9a-44b6a4aad218', 'Generación de trabajo', 'El GCU es uno de los espacios más activos y valorados de la Federación. Se están llevando a cabo acciones por verticales, charlas, gestión conjunta de staffing y acciones para   mejorar la sostenibilidad de cooperativas. En plenarios anteriores se discutieron iniciativas como la creación de un consorcio, contratación de vendedor por comisión, consultorías en   marketing y productos propios.', '#22c55e', array['¿Qué acciones concretas pueden potenciar la venta conjunta de productos y servicios de FACTTIC? ¿Cómo y quiénes las llevarían a cabo? ¿Cómo podrían financiarse?', '¿Qué acciones pueden impulsar la federación para el desarrollo de capacidades que generen mayores oportunidades laborales?', '¿Cómo se puede priorizar a las cooperativas que más lo necesitan?', '¿Cómo podemos identificar qué lenguajes o nichos son más prometedores en términos de mercado?', '¿Cómo articular acciones comerciales con cooperativas de la federación que no se dedican al software?']::text[], null, null, null, 'https://docs.google.com/document/d/1YL1HfjT08HsnUb9a3tk0QXNwIANTz_YcxEJDkXTz6_U/edit?usp=sharing', 1, true);
insert into public.facttic_equipos (id, nombre, tema, color, preguntas, reflexion, accionables, responsables, google_doc, orden, activo)
  values ('f6e9623b-8d8c-4232-b409-bba46c9eba67', 'Representatividad y poder', 'Abordamos los eventos de la Federación y las coopes que la representan. Hay muchas instancias valiosas de participación que queremos que sigan y aumenten. Sin embargo, en torno a   las representaciones se sucedieron fricciones este año, que esperamos despejar construyendo mecanismos más claros, transparentes y validados en conjunto.', '#f97316', array['¿Qué criterios podrían establecerse para las participaciones en eventos?', '¿Qué mecanismos y procedimientos para la selección y priorización de eventos?', '¿Cómo establecer una agenda anticipada?', '¿A través de qué mecanismos podría trabajarse y compartirse la información recolectada en los eventos?', '¿Qué mecanismos nos damos para ampliar y abrir las participaciones?', '¿Cómo puede colaborar cada cooperativa para construir un archivo y material compartido disponible en las instancias de representación?']::text[], null, null, null, 'https://docs.google.com/document/d/1_gbJOBXvUbIw378ebpvPM-vLd07fPOneV46hHHg7Whw/edit?usp=sharing', 2, true);
insert into public.facttic_equipos (id, nombre, tema, color, preguntas, reflexion, accionables, responsables, google_doc, orden, activo)
  values ('c4485d24-9579-4308-aa93-1a61b7204def', 'Posicionamiento Político', 'En algún momento en la Federación se trabajó sobre un manifiesto que no fue publicado. Este año se trabajaron temas coyunturales en grupos temporales y reuniones específicas, y se   debatió en asamblea. Sin embargo fuimos reactivos y fueron encuentros esporádicos.', '#eab308', array['¿Qué acciones y mecanismos concretos podemos crear para llegar a posicionamientos políticos de la manera más democrática posible?', '¿Cuáles son las temáticas generales sobre las que tenemos consenso? ¿Cómo trabajar sobre aquello en lo cuál no tenemos consenso?', '¿Quiénes podrían hacerse cargo de las diferentes instancias? ¿Una coope, un grupo de coopes, una comisión ad-hoc, un espacio?', '¿Cómo se validará el trabajo en las diferentes instancias?', '¿Cómo se procede con las situaciones urgentes?']::text[], null, null, null, 'https://docs.google.com/document/d/1LdTTfY0YRmu4g-Hiix5RmvEn7v_E0dojLXqxKJqfwu4/edit?usp=sharing', 3, true);
insert into public.facttic_equipos (id, nombre, tema, color, preguntas, reflexion, accionables, responsables, google_doc, orden, activo)
  values ('c50fc26f-55b2-4632-8493-853559ce8db7', 'Democratización, fortalecimiento y derechos', 'Los temas de este eje surgieron en la última encuesta de diagnóstico y en plenarios anteriores. Abarca equidad de género, federalización, acceso a la información y clarificación del   funcionamiento de la federación.', '#3b82f6', array['¿Qué acciones se pueden llevar a cabo para promover y fomentar la equidad de género? ¿Quiénes podrían llevarlas a cabo? ¿Cómo involucrar a la mayor cantidad de cooperativas?', '¿Qué acciones se pueden llevar a cabo para la federalización de FACTTIC? ¿Quiénes podrían ejecutarlas?', '¿Qué mecanismos y acciones establecer para garantizar el acceso a la información? Pensar un responsable para cada mecanismo o acción.', '¿Qué procedimientos hace falta debatir y/o explicitar para un mejor entendimiento del funcionamiento de la federación?']::text[], 'La conclusion estuvo buena', array['Ir al desalojo', '', '', '', '', '', '', '', '', '']::text[], array['Corren', '', '', '', '', '', '', '', '', '']::text[], 'https://docs.google.com/document/d/1os25r-Iw6iNbakBCVfp1ZChtwCtqa7NLjCZcqbRmUks/edit?usp=sharing', 4, true);
insert into public.facttic_equipos (id, nombre, tema, color, preguntas, reflexion, accionables, responsables, google_doc, orden, activo)
  values ('4012c2f8-79c9-4084-90bc-f57637271271', 'Posicionamiento sectorial y apertura', 'Los temas de este eje surgieron en la última encuesta de diagnóstico y en plenarios anteriores. Se enfoca en posicionar a FACTTIC como referente del sector y abrir el juego a   cooperativas que no son del sector informático.', '#8b5cf6', array['¿Qué acciones se pueden llevar a cabo para posicionarnos como referentes del sector?', '¿Quiénes podrían tomarlas?', '¿Qué acciones y mecanismos se pueden realizar y definir para abrir el juego a cooperativas que no son del sector informático?', '¿Quiénes podrían tomarlas?']::text[], null, null, null, 'https://docs.google.com/document/d/1GgCcJ8RhCghIZA1Zrg21iQdo1InefEUjgMQi2UMC3RE/edit?usp=sharing', 5, true);
insert into public.facttic_equipos (id, nombre, tema, color, preguntas, reflexion, accionables, responsables, google_doc, orden, activo)
  values ('829d5f6a-e59e-4096-b581-0ce23d00e86b', 'Objetivos y organización', 'La organización y el plan estratégico fue uno de los puntos más mencionados en la encuesta de diagnóstico y en el plenario de mitad de año. Se comenzó a trabajar en una comisión   integrada por personas del Consejo y otras coopes. Se debatió en asamblea, se circuló una encuesta, y en este plenario sumamos una nueva instancia para recabar información y construir   colectivamente un nuevo plan estratégico.', '#ec4899', array['Debatir y explicitar cuáles son los alcances y las tareas del consejo, el consejo ampliado y la asamblea.', 'Debatir y explicitar los objetivos deseados en relación a los espacios de vinculación internacional.', '¿Están faltando o sobrando objetivos en los ejes propuestos? ¿Cuáles? Si se proponen nuevos, ¿tendrían accionables cumplibles? ¿Quiénes podrían llevarlos a cabo?', '¿Cómo se podría fortalecer los espacios que no pudieron sostenerse este año? ¿Mantenemos el esquema de espacio como está? Si no, ¿cómo modificarlo?', '¿Cuál podría ser el mecanismo de seguimiento de los accionables propuestos?']::text[], null, null, null, 'https://docs.google.com/document/d/1LPNEtpwzjjRrJJy00Ymd6Z-sj9Vjqf5GqlAvtYXT46k/edit?usp=sharing', 6, true);

-- cooperativas (51)
insert into public.facttic_cooperativas (id, nombre, orden, activa) values
  ('32de92fd-a54d-4048-9611-b45807cd6142', 'Andes', 0, true),
  ('8ddf12ef-c60a-48ff-b1e5-43dd2f88a50a', 'Guanacoop', 0, true),
  ('ccc98fff-009c-48ee-8e4d-7c266e513139', 'Wannacode', 0, true),
  ('ae5c541d-0a14-4a1a-8c0b-8f832bddc675', 'Equality', 1, true),
  ('b1064902-9d49-4cbf-beae-bf886ea91d23', 'Devecoop', 2, true),
  ('2717b051-7ab4-4058-b7c9-d14fe0793a56', 'Elvex', 3, true),
  ('606903d1-52c0-4e07-9d43-31ebd72be6c6', 'Farox', 4, true),
  ('832e204e-8ec3-4fdb-836a-861f813a5d0a', 'Gcoop', 5, true),
  ('f6b096a5-5890-4513-8f00-c3bfc9026ca6', 'Tecso', 6, true),
  ('18f638e9-bf86-48e0-992e-7bd126a61147', 'Moldeo', 7, true),
  ('da85a0d1-b04b-4948-bb83-e77103dd8797', 'Unixono', 8, true),
  ('5de101ec-ace5-41ff-b425-b7f79a0adda5', 'COTIIC', 9, true),
  ('aa299f9e-4422-4a7d-9dcb-b498fb5cc12e', 'IT 10', 10, true),
  ('1bd91241-c2d9-446d-9a53-592fa903a8b2', 'Bantics', 11, true),
  ('1842e7f7-2f0b-4480-bff1-0f255d82f56b', 'Coprinf', 12, true),
  ('43732721-686c-448f-9589-58301d4596a8', 'Colectivo Libre', 13, true),
  ('68431f5f-d15a-4392-8069-30d0230165cd', 'Nayra', 14, true),
  ('006c9b6c-5382-4487-87bc-1f112fdc2d95', 'Cambá', 15, true),
  ('6d5e21c2-ae7e-45f4-9b7c-1944b3a2023d', 'Bitson', 16, true),
  ('a4d82295-2182-4543-afc6-09c35fa19b97', 'Geneos', 17, true),
  ('4fbefcb7-7a3e-4cd4-ad7a-79dbb8815f8e', 'Vsoft', 18, true),
  ('1c8c2b97-faf4-48e1-b01a-6fe515a68d9a', 'Código Libre', 19, true),
  ('4c8fbc28-76cf-4fab-afca-8b6e015035fe', 'Tera', 20, true),
  ('a88b6d3a-c5a3-4180-ad06-6cac78ca99ef', 'Eryx', 21, true),
  ('b3b098a2-be4c-4483-8401-8565f292df22', 'El Maizal', 22, true),
  ('9b663691-6bf2-4637-b902-7e56dc37f7ce', 'Animus', 23, true),
  ('d4e00061-e46b-4698-82b2-2ec1dba1ebf4', 'Batán', 24, true),
  ('32c057e6-bdbd-4565-be3d-6320921b7c43', 'Usina', 25, true),
  ('eadda2f5-00d9-40ff-9ec2-a567684096bf', 'Proyecto Wow', 26, true),
  ('ee14a2cb-61f7-4804-8f8c-9e6906c8dffe', 'Gaia', 27, true),
  ('91eb337b-d614-4653-b52f-e3073be2402b', 'Pollux', 28, true),
  ('d8b829b8-fbba-44cd-9321-32da2610e692', 'Indepi', 29, true),
  ('936544d8-1222-4098-adba-5652abc82b39', 'Matajuegos', 30, true),
  ('ea347d53-594e-4fbf-8b1a-ad6f9d2ab828', 'Teo-Coop', 31, true),
  ('f0dedab5-48fb-4d39-ad5a-06ae90b15d64', 'Redjar', 32, true),
  ('7d360481-0306-45ad-9664-4f86d90ffe0c', 'Coodesoft', 33, true),
  ('1de96bb1-b37f-457c-9002-6600ae789f40', 'ALT', 34, true),
  ('3ea24918-f1cc-453b-ab10-0241b1d656af', 'Sutty', 35, true),
  ('01757821-ae1f-4c90-88ef-e05bebbb4ca1', 'Tropa Circa', 36, true),
  ('782d61dc-558b-442e-bcb0-f6c07f347cb5', 'Abrapalabra', 37, true),
  ('9b3bccfc-5fdd-42ed-a615-8c88d5bca52a', 'Rook', 38, true),
  ('e7f9ab02-7bcc-40c6-b89f-acb71dd886ef', 'Factorial', 39, true),
  ('19e9109f-13d4-4982-bb45-11241cd8a3cb', 'Bootcoop', 40, true),
  ('e04df3c5-3c07-430e-ad09-6f41bc6586d7', 'Blaise', 41, true),
  ('db427765-d7b0-4621-8e7a-7344fbb6003e', 'Cambalache', 42, true),
  ('c9c63fc0-81d8-4784-838c-eaee40f85b3d', 'Drusa', 43, true),
  ('4718413a-e1db-4b6c-a171-325d70783082', 'Tau', 44, true),
  ('bc7613b4-5d02-4484-982d-0048bd4cc6eb', 'Cognitis', 45, true),
  ('44ad768e-9bc4-4118-82e5-6212e9158040', 'Ingecoop', 46, true),
  ('e2e520d4-fd86-4f8a-8368-245e483daef4', 'Lawal', 47, true),
  ('32137ec9-bb61-4010-9a6d-9b83e8176765', 'Mover', 48, true);

-- config (fila única): solo el timer, sin contraseña.
insert into public.facttic_config (id, timer_end, timer_duration, timer_paused, timer_paused_remaining)
  values (1, null, 15, false, null)
on conflict (id) do nothing;

update app_info set value = '3' where key = 'schema_version';
