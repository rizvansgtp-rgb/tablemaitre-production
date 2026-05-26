-- =========================================================================
-- SUPABASE SCHEMA FOR TABLEMAÎTRE (RC-4 HARDENED PRODUCTION READY)
-- =========================================================================

-- 1. STORES
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'host', 'waiter')) DEFAULT 'waiter',
    assigned_stores TEXT[] DEFAULT '{0301}',
    active_store TEXT REFERENCES public.stores(id) DEFAULT '0301',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SECTIONS
CREATE TABLE IF NOT EXISTS public.sections (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RESTAURANT TABLES (Aligned from 'tables')
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 2,
    status TEXT CHECK (status IN ('available', 'reserved', 'occupied', 'billing', 'cleaning', 'blocked')) DEFAULT 'available',
    x FLOAT NOT NULL DEFAULT 0,
    y FLOAT NOT NULL DEFAULT 0,
    shape TEXT CHECK (shape IN ('round', 'square', 'rect')) DEFAULT 'square',
    section_id TEXT,
    section_name TEXT,
    guest_count INTEGER DEFAULT 0,
    waiter_name TEXT,
    reservation_name TEXT,
    seated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. GUESTS
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    nationality TEXT,
    is_vip BOOLEAN DEFAULT false,
    visit_count INTEGER DEFAULT 1,
    preferences TEXT[],
    allergies TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RESERVATIONS
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('booked', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show')) DEFAULT 'booked',
    notes TEXT,
    table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. WAITLIST
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    status TEXT CHECK (status IN ('waiting', 'seated', 'cancelled')) DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLE MERGE LINKS
CREATE TABLE IF NOT EXISTS public.table_merge_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    primary_table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    merged_table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. RESERVATION STATUS LOGS
CREATE TABLE IF NOT EXISTS public.reservation_status_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ACTIVITY AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. OFFLINE SYNC QUEUE
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUTO PROFILE TRIGGER (Signup handler)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, assigned_stores, active_store)
  VALUES (new.id, new.email, 'waiter', '{0301}', '0301');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ROW LEVEL SECURITY RULES ENABLEMENT
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_merge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- CLEAN UP OLD / UNSAFE & EXISTING HARDENED POLICIES DEFINITIONS
-- =========================================================================
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_select" ON public.stores;
DROP POLICY IF EXISTS "stores_admin" ON public.stores;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_admin_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_admin_delete" ON public.profiles;

DROP POLICY IF EXISTS "sections_select_all" ON public.sections;
DROP POLICY IF EXISTS "sections_modify_policy" ON public.sections;
DROP POLICY IF EXISTS "sections_select" ON public.sections;
DROP POLICY IF EXISTS "sections_modify" ON public.sections;

DROP POLICY IF EXISTS "tables_select_policy" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tables_all_admin" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tables_update_staff" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tables_select" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tables_modify_mgmt" ON public.restaurant_tables;

DROP POLICY IF EXISTS "guests_select_policy" ON public.guests;
DROP POLICY IF EXISTS "guests_staff_modify" ON public.guests;
DROP POLICY IF EXISTS "guests_public_insert" ON public.guests;
DROP POLICY IF EXISTS "guests_select" ON public.guests;
DROP POLICY IF EXISTS "guests_modify_staff" ON public.guests;

DROP POLICY IF EXISTS "reservations_select_policy" ON public.reservations;
DROP POLICY IF EXISTS "reservations_staff_all" ON public.reservations;
DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
DROP POLICY IF EXISTS "reservations_modify_staff" ON public.reservations;

DROP POLICY IF EXISTS "waitlist_select_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_staff_all" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_select" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_modify_staff" ON public.waitlist;

DROP POLICY IF EXISTS "merge_admin_owner" ON public.table_merge_links;
DROP POLICY IF EXISTS "merge_manager" ON public.table_merge_links;
DROP POLICY IF EXISTS "merge_staff_select" ON public.table_merge_links;
DROP POLICY IF EXISTS "merge_all_admin" ON public.table_merge_links;
DROP POLICY IF EXISTS "merge_manager_policy" ON public.table_merge_links;

DROP POLICY IF EXISTS "status_logs_select" ON public.reservation_status_logs;
DROP POLICY IF EXISTS "status_logs_insert" ON public.reservation_status_logs;
DROP POLICY IF EXISTS "logs_select_policy" ON public.reservation_status_logs;
DROP POLICY IF EXISTS "logs_insert_policy" ON public.reservation_status_logs;

DROP POLICY IF EXISTS "activity_logs_modify" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_policy" ON public.activity_logs;

DROP POLICY IF EXISTS "offline_sync_queue_modify" ON public.offline_sync_queue;
DROP POLICY IF EXISTS "offline_sync_queue_policy" ON public.offline_sync_queue;

-- ==========================================
-- HARDENED POLICY DEFINITIONS
-- ==========================================
CREATE POLICY "stores_select" ON public.stores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stores_admin" ON public.stores FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin'))
);

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_owner_admin_insert" ON public.profiles FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin'))
);
CREATE POLICY "profiles_owner_admin_update" ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin'))
);
CREATE POLICY "profiles_owner_admin_delete" ON public.profiles FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin'))
);

CREATE POLICY "sections_select" ON public.sections FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND sections.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "sections_modify" ON public.sections FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'manager' AND sections.store_id = ANY(p.assigned_stores))
);

CREATE POLICY "tables_select" ON public.restaurant_tables FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND restaurant_tables.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "tables_modify_mgmt" ON public.restaurant_tables FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'manager' AND restaurant_tables.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "tables_update_staff" ON public.restaurant_tables FOR UPDATE WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('host', 'waiter') AND restaurant_tables.store_id = ANY(p.assigned_stores))
);

CREATE POLICY "guests_select" ON public.guests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "guests_modify_staff" ON public.guests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host'))
);

CREATE POLICY "reservations_select" ON public.reservations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND reservations.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "reservations_modify_staff" ON public.reservations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host', 'waiter') AND reservations.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "reservations_public_insert" ON public.reservations FOR INSERT WITH CHECK (
    status = 'booked'
);

CREATE POLICY "waitlist_select" ON public.waitlist FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND waitlist.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "waitlist_modify_staff" ON public.waitlist FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host', 'waiter') AND waitlist.store_id = ANY(p.assigned_stores))
);

-- table_merge_links
CREATE POLICY "merge_admin_owner" ON public.table_merge_links FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin'))
);
CREATE POLICY "merge_manager" ON public.table_merge_links FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'manager' AND table_merge_links.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "merge_staff_select" ON public.table_merge_links FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('host', 'waiter') AND table_merge_links.store_id = ANY(p.assigned_stores))
);

-- reservation_status_logs
CREATE POLICY "status_logs_select" ON public.reservation_status_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')) OR
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.reservations r ON r.id = reservation_status_logs.reservation_id WHERE p.id = auth.uid() AND r.store_id = ANY(p.assigned_stores))
);
CREATE POLICY "status_logs_insert" ON public.reservation_status_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.reservations r ON r.id = reservation_status_logs.reservation_id WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host', 'waiter') AND r.store_id = ANY(p.assigned_stores))
);

-- activity_logs
CREATE POLICY "activity_logs_modify" ON public.activity_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager'))
);

-- offline_sync_queue
CREATE POLICY "offline_sync_queue_modify" ON public.offline_sync_queue FOR ALL USING (
    auth.uid() = profile_id
);
