-- ============================================================
-- Parent Coaching with Marissa — Initial Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. Helper: get the current user's role from profiles
--    SECURITY DEFINER so it bypasses RLS when called from policies
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ──────────────────────────────────────────────────────────
-- 2. Tables
-- ──────────────────────────────────────────────────────────

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text,
  role        text CHECK (role IN ('admin', 'coach', 'parent')),
  coach_id    uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now()
);

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  coach_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  package     text CHECK (package IN ('confident_parent', 'partnership', 'ongoing')),
  status      text CHECK (status IN ('discovery', 'active', 'paused', 'completed')),
  start_date  date,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- Intake Forms
CREATE TABLE IF NOT EXISTS public.intake_forms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  submitted_at  timestamptz DEFAULT now(),
  responses     jsonb
);

-- Coaching Plans
CREATE TABLE IF NOT EXISTS public.coaching_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title         text,
  content       jsonb,
  is_published  boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  session_date         timestamptz,
  session_notes        text,
  action_items         jsonb,
  shared_with_parent   boolean DEFAULT false,
  created_at           timestamptz DEFAULT now()
);

-- Resources
CREATE TABLE IF NOT EXISTS public.resources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text,
  description  text,
  file_url     text,
  is_public    boolean DEFAULT false,
  tags         text[],
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- Client Resources (join table)
CREATE TABLE IF NOT EXISTS public.client_resources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  resource_id  uuid REFERENCES public.resources(id) ON DELETE CASCADE,
  assigned_at  timestamptz DEFAULT now(),
  assigned_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Discovery Calls (public intake — no auth required)
CREATE TABLE IF NOT EXISTS public.discovery_calls (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text,
  email          text,
  phone          text,
  child_ages     text,
  main_concern   text,
  how_they_heard text,
  submitted_at   timestamptz DEFAULT now(),
  status         text CHECK (status IN ('new', 'contacted', 'booked', 'converted', 'closed')) DEFAULT 'new'
);


-- ──────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_calls ENABLE ROW LEVEL SECURITY;


-- ── profiles ─────────────────────────────────────────────

-- Users read their own row; admins read all
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR get_user_role() = 'admin'
  );

-- Users update only their own row
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (get_user_role() = 'admin');


-- ── clients ──────────────────────────────────────────────

-- Parents see only their own client record
CREATE POLICY "clients_select_parent" ON public.clients
  FOR SELECT USING (
    profile_id = auth.uid()
    AND get_user_role() = 'parent'
  );

-- Coaches see/write clients they own
CREATE POLICY "clients_select_coach" ON public.clients
  FOR SELECT USING (
    coach_id = auth.uid()
    AND get_user_role() IN ('coach', 'admin')
  );

CREATE POLICY "clients_insert_coach" ON public.clients
  FOR INSERT WITH CHECK (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "clients_update_coach" ON public.clients
  FOR UPDATE USING (
    (coach_id = auth.uid() AND get_user_role() = 'coach')
    OR get_user_role() = 'admin'
  );

CREATE POLICY "clients_delete_admin" ON public.clients
  FOR DELETE USING (get_user_role() = 'admin');


-- ── intake_forms ─────────────────────────────────────────

-- Parents can insert their own intake form
CREATE POLICY "intake_insert_parent" ON public.intake_forms
  FOR INSERT WITH CHECK (
    get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND profile_id = auth.uid()
    )
  );

-- Parents can read their own intake form
CREATE POLICY "intake_select_parent" ON public.intake_forms
  FOR SELECT USING (
    get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND profile_id = auth.uid()
    )
  );

-- Coaches read intake forms for their clients
CREATE POLICY "intake_select_coach" ON public.intake_forms
  FOR SELECT USING (
    get_user_role() IN ('coach', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND coach_id = auth.uid()
    )
  );

-- Admins can read all
CREATE POLICY "intake_select_admin" ON public.intake_forms
  FOR SELECT USING (get_user_role() = 'admin');


-- ── coaching_plans ───────────────────────────────────────

-- Parents can only read published plans for their client record
CREATE POLICY "plans_select_parent" ON public.coaching_plans
  FOR SELECT USING (
    is_published = true
    AND get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND profile_id = auth.uid()
    )
  );

-- Coaches read/write plans for their clients
CREATE POLICY "plans_select_coach" ON public.coaching_plans
  FOR SELECT USING (
    coach_id = auth.uid()
    AND get_user_role() IN ('coach', 'admin')
  );

CREATE POLICY "plans_insert_coach" ON public.coaching_plans
  FOR INSERT WITH CHECK (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "plans_update_coach" ON public.coaching_plans
  FOR UPDATE USING (
    (coach_id = auth.uid() AND get_user_role() = 'coach')
    OR get_user_role() = 'admin'
  );

CREATE POLICY "plans_delete_admin" ON public.coaching_plans
  FOR DELETE USING (get_user_role() = 'admin');


-- ── sessions ─────────────────────────────────────────────

-- Parents see only sessions explicitly shared with them
CREATE POLICY "sessions_select_parent" ON public.sessions
  FOR SELECT USING (
    shared_with_parent = true
    AND get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND profile_id = auth.uid()
    )
  );

-- Coaches read/write sessions for their clients
CREATE POLICY "sessions_select_coach" ON public.sessions
  FOR SELECT USING (
    get_user_role() IN ('coach', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "sessions_insert_coach" ON public.sessions
  FOR INSERT WITH CHECK (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "sessions_update_coach" ON public.sessions
  FOR UPDATE USING (
    get_user_role() IN ('coach', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "sessions_delete_admin" ON public.sessions
  FOR DELETE USING (get_user_role() = 'admin');


-- ── resources ────────────────────────────────────────────

-- Anyone (authenticated or not) can read public resources
CREATE POLICY "resources_select_public" ON public.resources
  FOR SELECT USING (is_public = true);

-- Coaches and admins can read all resources
CREATE POLICY "resources_select_coach" ON public.resources
  FOR SELECT USING (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "resources_insert_coach" ON public.resources
  FOR INSERT WITH CHECK (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "resources_update_coach" ON public.resources
  FOR UPDATE USING (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "resources_delete_admin" ON public.resources
  FOR DELETE USING (get_user_role() = 'admin');


-- ── client_resources ─────────────────────────────────────

-- Parents see their own assignments
CREATE POLICY "cr_select_parent" ON public.client_resources
  FOR SELECT USING (
    get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND profile_id = auth.uid()
    )
  );

-- Coaches read/write assignments for their clients
CREATE POLICY "cr_select_coach" ON public.client_resources
  FOR SELECT USING (
    get_user_role() IN ('coach', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "cr_insert_coach" ON public.client_resources
  FOR INSERT WITH CHECK (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "cr_update_coach" ON public.client_resources
  FOR UPDATE USING (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "cr_delete_coach" ON public.client_resources
  FOR DELETE USING (get_user_role() IN ('coach', 'admin'));


-- ── discovery_calls ──────────────────────────────────────

-- Anyone can submit a discovery call (no auth required)
CREATE POLICY "discovery_insert_public" ON public.discovery_calls
  FOR INSERT WITH CHECK (true);

-- Coaches and admins can read and update all
CREATE POLICY "discovery_select_coach" ON public.discovery_calls
  FOR SELECT USING (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "discovery_update_coach" ON public.discovery_calls
  FOR UPDATE USING (get_user_role() IN ('coach', 'admin'));

CREATE POLICY "discovery_delete_admin" ON public.discovery_calls
  FOR DELETE USING (get_user_role() = 'admin');


-- ──────────────────────────────────────────────────────────
-- 4. Auto-create profile on user signup
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists before recreating
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
