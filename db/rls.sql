-- PulseCRM Row-Level Security (RLS) Policies
-- Enforces tenant isolation, membership verification, and RBAC at the PostgreSQL engine level.

-- 1. Helper function: Get active membership for current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_has_org_membership(target_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper function: Get role of authenticated user in target organization
CREATE OR REPLACE FUNCTION public.current_user_org_role(target_org_id uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = target_org_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable Row-Level Security across all tenant-isolated tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ORGANIZATIONS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "org_select_policy" ON public.organizations
  FOR SELECT
  USING (
    public.current_user_has_org_membership(id)
  );

CREATE POLICY "org_update_policy" ON public.organizations
  FOR UPDATE
  USING (
    public.current_user_org_role(id) IN ('owner', 'admin')
  )
  WITH CHECK (
    public.current_user_org_role(id) IN ('owner', 'admin')
  );

-- -----------------------------------------------------------------------------
-- ORGANIZATION MEMBERS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "org_members_select_policy" ON public.organization_members
  FOR SELECT
  USING (
    public.current_user_has_org_membership(organization_id)
  );

CREATE POLICY "org_members_insert_policy" ON public.organization_members
  FOR INSERT
  WITH CHECK (
    public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "org_members_update_policy" ON public.organization_members
  FOR UPDATE
  USING (
    public.current_user_org_role(organization_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "org_members_delete_policy" ON public.organization_members
  FOR DELETE
  USING (
    public.current_user_org_role(organization_id) = 'owner'
  );

-- -----------------------------------------------------------------------------
-- CONTACTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "contacts_select_policy" ON public.contacts
  FOR SELECT
  USING (
    public.current_user_has_org_membership(organization_id)
  );

CREATE POLICY "contacts_insert_policy" ON public.contacts
  FOR INSERT
  WITH CHECK (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin', 'sales_rep')
  );

CREATE POLICY "contacts_update_policy" ON public.contacts
  FOR UPDATE
  USING (
    public.current_user_has_org_membership(organization_id)
    AND (
      public.current_user_org_role(organization_id) IN ('owner', 'admin')
      OR (public.current_user_org_role(organization_id) = 'sales_rep' AND assigned_to_id = auth.uid())
    )
  )
  WITH CHECK (
    public.current_user_has_org_membership(organization_id)
  );

CREATE POLICY "contacts_delete_policy" ON public.contacts
  FOR DELETE
  USING (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- -----------------------------------------------------------------------------
-- DEALS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "deals_select_policy" ON public.deals
  FOR SELECT
  USING (
    public.current_user_has_org_membership(organization_id)
  );

CREATE POLICY "deals_insert_policy" ON public.deals
  FOR INSERT
  WITH CHECK (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin', 'sales_rep')
  );

CREATE POLICY "deals_update_policy" ON public.deals
  FOR UPDATE
  USING (
    public.current_user_has_org_membership(organization_id)
    AND (
      public.current_user_org_role(organization_id) IN ('owner', 'admin')
      OR (public.current_user_org_role(organization_id) = 'sales_rep' AND assigned_to_id = auth.uid())
    )
  )
  WITH CHECK (
    public.current_user_has_org_membership(organization_id)
  );

CREATE POLICY "deals_delete_policy" ON public.deals
  FOR DELETE
  USING (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- -----------------------------------------------------------------------------
-- PIPELINE STAGES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "pipeline_stages_select" ON public.pipeline_stages
  FOR SELECT
  USING (public.current_user_has_org_membership(organization_id));

CREATE POLICY "pipeline_stages_manage" ON public.pipeline_stages
  FOR ALL
  USING (
    public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- -----------------------------------------------------------------------------
-- ACTIVITIES & TASKS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "activities_select" ON public.activities
  FOR SELECT USING (public.current_user_has_org_membership(organization_id));

CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT WITH CHECK (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin', 'sales_rep')
  );

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (public.current_user_has_org_membership(organization_id));

CREATE POLICY "tasks_manage" ON public.tasks
  FOR ALL USING (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin', 'sales_rep')
  );

-- -----------------------------------------------------------------------------
-- AUDIT LOGS (Append-only by server actions / triggers, viewable by owner/admin)
-- -----------------------------------------------------------------------------
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- Ordinary users cannot delete or update audit logs
CREATE POLICY "audit_logs_no_update" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "audit_logs_no_delete" ON public.audit_logs
  FOR DELETE USING (false);

-- -----------------------------------------------------------------------------
-- API KEYS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "api_keys_select" ON public.api_keys
  FOR SELECT USING (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "api_keys_manage" ON public.api_keys
  FOR ALL USING (
    public.current_user_has_org_membership(organization_id)
    AND public.current_user_org_role(organization_id) IN ('owner', 'admin')
  );
