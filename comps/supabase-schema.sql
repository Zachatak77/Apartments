-- ══ COMP ANALYSIS APP — SUPABASE SCHEMA ══
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query

-- ── Comp Pools ──
create table if not exists comp_pools (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  location    text,
  role        text not null default 'buyer' check (role in ('buyer', 'seller')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Comparables ──
create table if not exists comps (
  id                   uuid primary key default gen_random_uuid(),
  pool_id              uuid not null references comp_pools(id) on delete cascade,

  -- identity
  address              text not null,
  town                 text,
  source_url           text,

  -- pricing
  original_list_price  numeric,
  last_list_price      numeric,
  sold_price           numeric,

  -- dates
  list_date            date,
  last_price_date      date,
  sold_date            date,

  -- physical
  sqft                 numeric,
  lot_sqft             numeric,
  year_built           integer,
  beds                 numeric,
  baths                numeric,
  stories              integer default 2,

  -- financial
  taxes                numeric,
  days_on_market       integer,
  days_to_contract     integer,

  -- computed (stored for quick querying)
  psf                  numeric,
  lot_psf              numeric,

  -- status
  is_closed            boolean not null default false,
  over_ask             boolean not null default false,

  -- notes
  notes                text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Row-Level Security ──
-- Users can only see and modify their own data.

alter table comp_pools enable row level security;
alter table comps       enable row level security;

-- comp_pools policies
create policy "Users manage own pools"
  on comp_pools for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- comps policies (access via pool ownership)
create policy "Users manage comps in own pools"
  on comps for all
  using  (pool_id in (select id from comp_pools where user_id = auth.uid()))
  with check (pool_id in (select id from comp_pools where user_id = auth.uid()));

-- ── Indexes ──
create index if not exists idx_comp_pools_user_id on comp_pools(user_id);
create index if not exists idx_comps_pool_id      on comps(pool_id);
