-- =========================================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) POLICIES FOR TABLEMAÎTRE (RC-4 HARDENED)
-- =========================================================================

-- Ensure RLS is enabled on all tables
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

-- Clean up any legacy or potentially unsafe policies
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_policy" ON public.stores;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "sections_select_all" ON public.sections;
DROP POLICY IF EXISTS "sections_modify_policy" ON public.sections;
DROP POLICY IF EXISTS "tables_select_policy" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tables_all_admin" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tables_update_staff" ON public.restaurant_tables;
DROP POLICY IF EXISTS "guests_select_policy" ON public.guests;
DROP POLICY IF EXISTS "guests_staff_modify" ON public.guests;
DROP POLICY IF EXISTS "guests_public_insert" ON public.guests;
DROP POLICY IF EXISTS "reservations_select_policy" ON public.reservations;
DROP POLICY IF EXISTS "reservations_staff_all" ON public.reservations;
DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;
DROP POLICY IF EXISTS "waitlist_select_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_staff_all" ON public.waitlist;
DROP POLICY IF EXISTS "merge_all_admin" ON public.table_merge_links;
DROP POLICY IF EXISTS "merge_manager_policy" ON public.table_merge_links;
DROP POLICY IF EXISTS "merge_staff_select" ON public.table_merge_links;
DROP POLICY IF EXISTS "logs_select_policy" ON public.reservation_status_logs;
DROP POLICY IF EXISTS "logs_insert_policy" ON public.reservation_status_logs;
DROP POLICY IF EXISTS "activity_logs_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "offline_sync_queue_policy" ON public.offline_sync_queue;

-- ==========================================
-- 1. STORES
-- ==========================================
DROP POLICY IF EXISTS "stores_select" ON public.stores;
CREATE POLICY "stores_select" ON public.stores
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "stores_admin" ON public.stores;
CREATE POLICY "stores_admin" ON public.stores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );

-- ==========================================
-- 2. PROFILES (STAFF)
-- ==========================================
-- Read-only select for logged in staff, completely hidden from anon.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_owner_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_admin_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_admin_delete" ON public.profiles;

CREATE POLICY "profiles_owner_admin_insert" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "profiles_owner_admin_update" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "profiles_owner_admin_delete" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );


-- ==========================================
-- 3. SECTIONS
-- ==========================================
-- Authorized staff can fetch sections.
DROP POLICY IF EXISTS "sections_select" ON public.sections;
CREATE POLICY "sections_select" ON public.sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND sections.store_id = ANY(p.assigned_stores)
        )
    );

DROP POLICY IF EXISTS "sections_modify" ON public.sections;
CREATE POLICY "sections_modify" ON public.sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        ) OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'manager' AND sections.store_id = ANY(p.assigned_stores)
        )
    );

-- ==========================================
-- 4. RESTAURANT TABLES
-- ==========================================
-- All active staff can view layout.
DROP POLICY IF EXISTS "tables_select" ON public.restaurant_tables;
CREATE POLICY "tables_select" ON public.restaurant_tables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND restaurant_tables.store_id = ANY(p.assigned_stores)
        )
    );

-- Management can fully alter store floor plans.
DROP POLICY IF EXISTS "tables_modify_mgmt" ON public.restaurant_tables;
CREATE POLICY "tables_modify_mgmt" ON public.restaurant_tables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        ) OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'manager' AND restaurant_tables.store_id = ANY(p.assigned_stores)
        )
    );

-- Only host/waiter can update status (never delete/add tables or edit coordinate numbers).
DROP POLICY IF EXISTS "tables_update_staff" ON public.restaurant_tables;
CREATE POLICY "tables_update_staff" ON public.restaurant_tables
    FOR UPDATE WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('host', 'waiter') AND restaurant_tables.store_id = ANY(p.assigned_stores)
        )
    );

-- ==========================================
-- 5. GUESTS CRM (Hardened: completely hidden from anonymous public)
-- ==========================================
-- Only authenticated staff can view CRM.
DROP POLICY IF EXISTS "guests_select" ON public.guests;
CREATE POLICY "guests_select" ON public.guests
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only managers, hosts, owners can modify CRM profiles.
DROP POLICY IF EXISTS "guests_modify_staff" ON public.guests;
CREATE POLICY "guests_modify_staff" ON public.guests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host')
        )
    );

-- Public bookings do NOT insert directly into CRM. Removed public guests insert policy entirely.

-- ==========================================
-- 6. RESERVATIONS
-- ==========================================
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
CREATE POLICY "reservations_select" ON public.reservations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND reservations.store_id = ANY(p.assigned_stores)
        )
    );

DROP POLICY IF EXISTS "reservations_modify_staff" ON public.reservations;
CREATE POLICY "reservations_modify_staff" ON public.reservations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host', 'waiter') AND reservations.store_id = ANY(p.assigned_stores)
        )
    );

-- Public booking inserts only directly to reservations with preset status.
DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;
CREATE POLICY "reservations_public_insert" ON public.reservations
    FOR INSERT WITH CHECK (
        status = 'booked'
    );

-- ==========================================
-- 7. WAITLIST
-- ==========================================
DROP POLICY IF EXISTS "waitlist_select" ON public.waitlist;
CREATE POLICY "waitlist_select" ON public.waitlist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND waitlist.store_id = ANY(p.assigned_stores)
        )
    );

DROP POLICY IF EXISTS "waitlist_modify_staff" ON public.waitlist;
CREATE POLICY "waitlist_modify_staff" ON public.waitlist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host', 'waiter') AND waitlist.store_id = ANY(p.assigned_stores)
        )
    );

-- ==========================================
-- 8. TABLE MERGE LINKS
-- ==========================================
DROP POLICY IF EXISTS "merge_admin_owner" ON public.table_merge_links;
CREATE POLICY "merge_admin_owner" ON public.table_merge_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "merge_manager" ON public.table_merge_links;
CREATE POLICY "merge_manager" ON public.table_merge_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'manager' AND table_merge_links.store_id = ANY(p.assigned_stores)
        )
    );

DROP POLICY IF EXISTS "merge_staff_select" ON public.table_merge_links;
CREATE POLICY "merge_staff_select" ON public.table_merge_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('host', 'waiter') AND table_merge_links.store_id = ANY(p.assigned_stores)
        )
    );

-- ==========================================
-- 9. RESERVATION STATUS LOGS
-- ==========================================
DROP POLICY IF EXISTS "status_logs_select" ON public.reservation_status_logs;
CREATE POLICY "status_logs_select" ON public.reservation_status_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
        ) OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.reservations r ON r.id = reservation_status_logs.reservation_id
            WHERE p.id = auth.uid() AND r.store_id = ANY(p.assigned_stores)
        )
    );

-- Managers, hosts, waiters can log state shifts.
DROP POLICY IF EXISTS "status_logs_insert" ON public.reservation_status_logs;
CREATE POLICY "status_logs_insert" ON public.reservation_status_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.reservations r ON r.id = reservation_status_logs.reservation_id
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'host', 'waiter') AND r.store_id = ANY(p.assigned_stores)
        )
    );

-- ==========================================
-- 10. ACTIVITY LOGS
-- ==========================================
DROP POLICY IF EXISTS "activity_logs_modify" ON public.activity_logs;
CREATE POLICY "activity_logs_modify" ON public.activity_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager')
        )
    );

-- ==========================================
-- 11. OFFLINE SYNC QUEUE
-- ==========================================
DROP POLICY IF EXISTS "offline_sync_queue_modify" ON public.offline_sync_queue;
CREATE POLICY "offline_sync_queue_modify" ON public.offline_sync_queue
    FOR ALL USING (
        auth.uid() = profile_id
    );

-- ==========================================
-- 12. DATABASE PRIVILEGES (GRANTS)
-- ==========================================
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Authenticated staff get complete tables/sequence permissions (governed by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anon guest role gets zero access to profiles, guests, tables, or logs
-- Only grant INSERT on public.reservations to support the public booking insert policy
GRANT INSERT ON public.reservations TO anon;

