-- ══════════════════════════════════════════════════════════════════
-- Migration v2: Standalone Properties + pool membership
-- Run once in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

-- 1. Properties table (user-owned, pool-agnostic)
create table if not exists properties (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,

  address              text not null,
  town                 text,
  source_url           text,

  original_list_price  numeric,
  last_list_price      numeric,
  sold_price           numeric,

  list_date            date,
  last_price_date      date,
  sold_date            date,

  sqft                 numeric,
  lot_sqft             numeric,
  year_built           integer,
  beds                 numeric,
  baths                numeric,
  stories              integer default 2,

  taxes                numeric,
  days_on_market       integer,
  days_to_contract     integer,

  psf                  numeric,
  lot_psf              numeric,

  is_closed            boolean not null default false,
  over_ask             boolean not null default false,

  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 2. Pool membership junction table
create table if not exists pool_properties (
  pool_id     uuid not null references comp_pools(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (pool_id, property_id)
);

-- 3. Row-level security
alter table properties     enable row level security;
alter table pool_properties enable row level security;

create policy "properties_user_all" on properties
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pool_properties_user_all" on pool_properties
  for all
  using (
    exists (select 1 from comp_pools where id = pool_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from comp_pools where id = pool_id and user_id = auth.uid())
  );

-- 4. Indexes
create index if not exists idx_properties_user_id       on properties(user_id);
create index if not exists idx_pool_properties_pool_id  on pool_properties(pool_id);
create index if not exists idx_pool_properties_prop_id  on pool_properties(property_id);

-- 5. Migrate existing comps → properties (preserves original IDs)
insert into properties (
  id, user_id, address, town, source_url,
  original_list_price, last_list_price, sold_price,
  list_date, last_price_date, sold_date,
  sqft, lot_sqft, year_built, beds, baths, stories,
  taxes, days_on_market, days_to_contract,
  psf, lot_psf, is_closed, over_ask, notes,
  created_at, updated_at
)
select
  c.id, cp.user_id, c.address, c.town, c.source_url,
  c.original_list_price, c.last_list_price, c.sold_price,
  c.list_date, c.last_price_date, c.sold_date,
  c.sqft, c.lot_sqft, c.year_built, c.beds, c.baths, c.stories,
  c.taxes, c.days_on_market, c.days_to_contract,
  c.psf, c.lot_psf, c.is_closed, c.over_ask, c.notes,
  c.created_at, c.updated_at
from comps c
join comp_pools cp on c.pool_id = cp.id
on conflict (id) do nothing;

-- 6. Migrate pool memberships
insert into pool_properties (pool_id, property_id, added_at)
select pool_id, id, created_at
from comps
on conflict do nothing;

-- 7. Drop the old comps table
drop table if exists comps;
