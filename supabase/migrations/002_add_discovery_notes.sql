-- Add notes column to discovery_calls table
ALTER TABLE public.discovery_calls ADD COLUMN IF NOT EXISTS notes text;
