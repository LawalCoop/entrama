-- Poder editar las actividades desde el panel.
--
-- La 0010 le dio a anon lectura y alta, y nada más. El razonamiento fue que una
-- lista que cualquiera pueda vaciar en vivo es peor que una con alguna
-- repetida. Pero el panel de admin usa la misma anon key que los participantes
-- —es el mismo rol de Postgres, ver "Lo que esto NO resuelve" en docs/live.md—,
-- así que esa restricción no dejaba afuera a nadie más que al panel: quien
-- conduce se quedó sin poder corregir un nombre mal escrito o bajar una
-- actividad repetida.
--
-- Con esto, `actividades` queda igual que `cooperativas`, `equipos` y
-- `participantes`: abiertas a anon. No es un permiso nuevo en la práctica, es
-- dejar de ser más estricto acá que en el resto de la app sin ganar nada.

create policy "actividades: edición" on public.actividades for update to anon using (true);
create policy "actividades: baja"    on public.actividades for delete to anon using (true);

grant update, delete on public.actividades to anon;

update app_info set value = '11' where key = 'schema_version';
