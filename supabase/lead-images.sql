-- Execute uma vez no SQL Editor do Supabase
-- antes de testar o novo formulário.

alter table public.leads
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists plate text,
  add column if not exists version text,
  add column if not exists fuel text,
  add column if not exists transmission text,
  add column if not exists vehicle_condition text,
  add column if not exists damage text,
  add column if not exists financed boolean,
  add column if not exists notes text;


create table if not exists public.lead_images (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null
    references public.leads(id)
    on delete cascade,

  storage_path text not null unique,

  position integer not null
    default 0
    check (position >= 0),

  created_at timestamptz
    not null
    default now()
);


alter table public.lead_images
enable row level security;


-- =====================================================
-- LEAD_IMAGES
-- Permite que visitante registre as fotos do próprio lead
-- =====================================================

drop policy if exists
"public can register lead images"
on public.lead_images;

create policy
"public can register lead images"
on public.lead_images
for insert
to anon
with check (
  storage_path like lead_id::text || '/%'
);


-- =====================================================
-- ADMIN
-- Administrador pode consultar registros das fotos
-- =====================================================

drop policy if exists
"admins can read lead images"
on public.lead_images;

create policy
"admins can read lead images"
on public.lead_images
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  )
);


-- =====================================================
-- STORAGE BUCKET
-- Fotos dos veículos enviados pelos clientes
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'lead-images',
  'lead-images',

  -- precisa permanecer TRUE porque o painel
  -- usa /storage/v1/object/public/lead-images/...
  true,

  -- 8 MB por arquivo
  8388608,

  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)

on conflict (id)
do update set

  public = excluded.public,

  file_size_limit =
    excluded.file_size_limit,

  allowed_mime_types =
    excluded.allowed_mime_types;


-- =====================================================
-- UPLOAD PÚBLICO
-- Cliente não precisa estar logado para enviar as fotos
-- =====================================================

drop policy if exists
"public can upload lead images"
on storage.objects;

create policy
"public can upload lead images"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'lead-images'
);


-- =====================================================
-- LEITURA ADMINISTRATIVA
-- =====================================================

drop policy if exists
"admins can read lead image objects"
on storage.objects;

create policy
"admins can read lead image objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lead-images'

  and exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  )
);