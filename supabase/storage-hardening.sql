-- =====================================================
-- ENDURECIMENTO DO STORAGE (OPCIONAL, EXECUÇÃO MANUAL)
-- Execute no SQL Editor do Supabase somente depois que o
-- projeto voltar a funcionar e o novo frontend estiver no ar.
-- Revise cada bloco antes de executar. Nenhum dado é apagado.
-- =====================================================


-- -----------------------------------------------------
-- 1. LIMITE DE TAMANHO DOS ARQUIVOS
-- O site agora comprime as fotos no navegador (normalmente
-- 100 KB a 400 KB). O limite de 3 MB impede que arquivos
-- grandes voltem a ser enviados e baixados.
-- -----------------------------------------------------

update storage.buckets
set file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('vehicle-images', 'lead-images');


-- -----------------------------------------------------
-- 2. UPLOAD PÚBLICO DE FOTOS DE LEADS SOMENTE PARA LEADS
--    RECENTES E COM NO MÁXIMO 12 FOTOS
-- Hoje qualquer pessoa com a Publishable Key pode enviar
-- arquivos ilimitados ao bucket lead-images (que é público),
-- o que permite usar o bucket como hospedagem e gerar egress.
-- Requer que public.leads.created_at seja preenchido
-- automaticamente (default now()).
-- -----------------------------------------------------

create or replace function public.lead_is_recent(lead_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.leads l
    where l.id::text = lead_folder
      and l.created_at > now() - interval '30 minutes'
  );
$$;

create or replace function public.lead_photo_count(lead_folder text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from storage.objects o
  where o.bucket_id = 'lead-images'
    and (storage.foldername(o.name))[1] = lead_folder;
$$;

revoke all on function public.lead_is_recent(text) from public;
revoke all on function public.lead_photo_count(text) from public;
grant execute on function public.lead_is_recent(text) to anon, authenticated;
grant execute on function public.lead_photo_count(text) to anon, authenticated;

drop policy if exists "public can upload lead images" on storage.objects;

create policy "public can upload lead images"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'lead-images'
  and public.lead_is_recent((storage.foldername(name))[1])
  and public.lead_photo_count((storage.foldername(name))[1]) < 12
);

drop policy if exists "public can register lead images" on public.lead_images;

create policy "public can register lead images"
on public.lead_images
for insert
to anon
with check (
  storage_path like lead_id::text || '/%'
  and public.lead_is_recent(lead_id::text)
);


-- -----------------------------------------------------
-- 3. LEITURA ADMINISTRATIVA MAIS EFICIENTE
-- (select auth.uid()) é avaliado uma vez por consulta,
-- e não uma vez por linha.
-- -----------------------------------------------------

drop policy if exists "admins can read lead images" on public.lead_images;

create policy "admins can read lead images"
on public.lead_images
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  )
);

create index if not exists lead_images_lead_id_idx
on public.lead_images (lead_id);


-- -----------------------------------------------------
-- 4. (OPCIONAL) TORNAR AS FOTOS DE LEADS PRIVADAS
-- As fotos dos clientes mostram placas e não precisam ser
-- públicas. O painel já gera URLs assinadas automaticamente
-- quando a URL pública deixa de funcionar.
-- A política "admins can read lead image objects"
-- (supabase/lead-images.sql) precisa existir.
-- -----------------------------------------------------

-- update storage.buckets set public = false where id = 'lead-images';


-- -----------------------------------------------------
-- 5. (SOMENTE SE NECESSÁRIO) PERMISSÃO PARA A FERRAMENTA
--    tools/otimizar-fotos.html ATUALIZAR vehicle_images
-- Execute apenas se a ferramenta informar que o banco não
-- permitiu atualizar vehicle_images.
-- -----------------------------------------------------

-- create policy "admins can update vehicle images"
-- on public.vehicle_images
-- for update
-- to authenticated
-- using (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'))
-- with check (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'));


-- -----------------------------------------------------
-- REVERSÃO DO BLOCO 2 (volta ao comportamento anterior)
-- -----------------------------------------------------
-- drop policy if exists "public can upload lead images" on storage.objects;
-- create policy "public can upload lead images" on storage.objects for insert to anon with check (bucket_id = 'lead-images');
-- drop policy if exists "public can register lead images" on public.lead_images;
-- create policy "public can register lead images" on public.lead_images for insert to anon with check (storage_path like lead_id::text || '/%');
