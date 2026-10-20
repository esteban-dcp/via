-- Migration 010: admin account + admin read access to moderate reports
UPDATE public.users SET is_admin = true
 WHERE auth_id = (SELECT id FROM auth.users WHERE email = 'esteban.morochoc@gmail.com');

DROP POLICY IF EXISTS "reports_select_admin" ON public.reports;
CREATE POLICY "reports_select_admin" ON public.reports
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users_select_admin" ON public.users;
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT TO authenticated USING (public.is_admin());
