-- ══════════════════════════════════════════════════════════════════
-- Migration v3: Add contract_date to properties
-- Run once in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

alter table properties
  add column if not exists contract_date date;
