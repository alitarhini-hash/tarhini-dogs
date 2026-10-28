-- Tarhini's Dogs content manager
-- Run this whole file once in Supabase Dashboard > SQL Editor.
-- Only an account explicitly marked as the owner in Supabase app_metadata can edit content.

create extension if not exists pgcrypto;

create or replace function public.is_store_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'store_owner', 'false') = 'true';
$$;

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  phone text not null default '+961 03 683 218',
  whatsapp_phone text not null default '9613683218',
  email text not null default 'Tarhini.hotdogs@gmail.com',
  address_en text not null default 'Hamra Street, near Geox, Beirut, Lebanon',
  address_ar text not null default 'شارع الحمرا، قرب جيوكس، بيروت، لبنان',
  hours_en text not null default E'Mon to Sat: 11am to 9pm\nSunday: 12pm to 6pm',
  hours_ar text not null default E'الإثنين إلى السبت: 11 صباحًا – 9 مساءً\nالأحد: 12 ظهرًا – 6 مساءً',
  directions_url text not null default 'https://www.google.com/maps/dir/?api=1&destination=Geox+Hamra+Street+Beirut',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ar text not null default '',
  description_en text not null default '',
  description_ar text not null default '',
  category text not null check (category in ('dogs','sides','drinks')),
  price numeric(8,2) not null check (price >= 0),
  emoji text not null default '🌭',
  photo_path text not null default '',
  available boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.menu_items (slug,name_en,name_ar,category,price,emoji,photo_path,sort_order) values
  ('classic','Classic Hotdog','هوت دوغ كلاسيك','dogs',3,'🌭','image/classic.jpg',10),
  ('chicago','Chicago','شيكاغو','dogs',7,'🌭','image/chicago.jpg',20),
  ('italian','Italian','إيطالي','dogs',6,'🌭','image/italian.jpg',30),
  ('nutella','Nutella','نوتيلا','dogs',5,'🍫','image/nutella.jpg',40),
  ('dodger','Dodger Dog','دودجر دوغ','dogs',5,'🌭','image/dodger.jpg',50),
  ('hawaiian','Hawaiian','هاوايان','dogs',6,'🍍','image/hawaiian.jpg',60),
  ('carolina','Carolina','كارولينا','dogs',6,'🌭','image/carolina.jpg',70),
  ('fries','Fries','بطاطا مقلية','sides',3,'🍟','image/fries.jpg',80),
  ('loaded-fries','Loaded Fries','بطاطا محمّلة','sides',6,'🍟','image/loaded.jpg',90),
  ('coke','Coke','كوكا كولا','drinks',3,'🥤','image/coke.jpg',100),
  ('fanta','Fanta','فانتا','drinks',3,'🥤','image/fanta.jpg',110),
  ('sprite','Sprite','سبرايت','drinks',3,'🥤','image/sprite.jpg',120),
  ('water','Water','مياه','drinks',1,'💧','image/water.jpg',130)
on conflict (slug) do nothing;

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null default '',
  role_en text not null default '',
  role_ar text not null default '',
  photo_path text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.staff_members (name_en,name_ar,role_en,role_ar,photo_path,sort_order)
select 'Ali Tarhini','علي ترحيني','Owner','المالك','image/ali.jpeg',10
where not exists (select 1 from public.staff_members);
insert into public.staff_members (name_en,name_ar,role_en,role_ar,photo_path,sort_order)
select 'Youssef Fakih','يوسف فقيه','Chef','الشيف','image/usef.jpeg',20
where (select count(*) from public.staff_members) = 1;
insert into public.staff_members (name_en,name_ar,role_en,role_ar,photo_path,sort_order)
select 'Ali Youseff','علي يوسف','Manager','المدير','image/manager.jpeg',30
where (select count(*) from public.staff_members) = 2;

alter table public.store_settings enable row level security;
alter table public.menu_items enable row level security;
alter table public.staff_members enable row level security;

drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings" on public.store_settings
  for select to anon, authenticated using (true);
drop policy if exists "Owner manages store settings" on public.store_settings;
create policy "Owner manages store settings" on public.store_settings
  for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

drop policy if exists "Public can read active menu" on public.menu_items;
create policy "Public can read active menu" on public.menu_items
  for select to anon, authenticated using (active);
drop policy if exists "Owner manages all menu items" on public.menu_items;
create policy "Owner manages all menu items" on public.menu_items
  for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

drop policy if exists "Public can read active staff" on public.staff_members;
create policy "Public can read active staff" on public.staff_members
  for select to anon, authenticated using (active);
drop policy if exists "Owner manages all staff" on public.staff_members;
create policy "Owner manages all staff" on public.staff_members
  for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

grant select on public.store_settings, public.menu_items, public.staff_members to anon, authenticated;
grant select, insert, update, delete on public.store_settings, public.menu_items, public.staff_members to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('store-media','store-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public reads store photos" on storage.objects;
create policy "Public reads store photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'store-media');
drop policy if exists "Owner uploads store photos" on storage.objects;
create policy "Owner uploads store photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'store-media' and public.is_store_owner());
drop policy if exists "Owner updates store photos" on storage.objects;
create policy "Owner updates store photos" on storage.objects
  for update to authenticated using (bucket_id = 'store-media' and public.is_store_owner())
  with check (bucket_id = 'store-media' and public.is_store_owner());
drop policy if exists "Owner deletes store photos" on storage.objects;
create policy "Owner deletes store photos" on storage.objects
  for delete to authenticated using (bucket_id = 'store-media' and public.is_store_owner());
