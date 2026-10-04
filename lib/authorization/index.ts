export type UserRole = "owner" | "admin" | "sales_rep" | "viewer";

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  status?: "active" | "invited" | "suspended";
}

/**
 * Check if the user has an active membership in the requested organization.
 */
export function assertActiveMembership(context: AuthContext): void {
  if (context.status && context.status !== "active") {
    throw new Error(`Membership is ${context.status}, access denied.`);
  }
}

/**
 * Dashboard access: Available to all active members.
 */
export function canViewDashboard(context: AuthContext): boolean {
  return context.status === undefined || context.status === "active";
}

/**
 * Contact Permissions
 */
export function canViewContact(
  context: AuthContext,
  contact?: { assigned_to_id?: string | null; organization_id: string }
): boolean {
  if (contact && contact.organization_id !== context.organizationId) return false;
  return true; // All roles can view tenant contacts
}

export function canCreateContact(context: AuthContext): boolean {
  return ["owner", "admin", "sales_rep"].includes(context.role);
}

export function canEditContact(
  context: AuthContext,
  contact: { assigned_to_id?: string | null; organization_id: string }
): boolean {
  if (contact.organization_id !== context.organizationId) return false;
  if (["owner", "admin"].includes(context.role)) return true;
  if (context.role === "sales_rep") {
    // Sales rep can edit unassigned or contacts assigned to them
    return !contact.assigned_to_id || contact.assigned_to_id === context.userId;
  }
  return false;
}

export function canDeleteContact(
  context: AuthContext,
  contact: { organization_id: string }
): boolean {
  if (contact.organization_id !== context.organizationId) return false;
  return ["owner", "admin"].includes(context.role);
}

/**
 * Deal Permissions
 */
export function canViewDeal(
  context: AuthContext,
  deal?: { assigned_to_id?: string | null; organization_id: string }
): boolean {
  if (deal && deal.organization_id !== context.organizationId) return false;
  return true;
}

export function canCreateDeal(context: AuthContext): boolean {
  return ["owner", "admin", "sales_rep"].includes(context.role);
}

export function canEditDeal(
  context: AuthContext,
  deal: { assigned_to_id?: string | null; organization_id: string }
): boolean {
  if (deal.organization_id !== context.organizationId) return false;
  if (["owner", "admin"].includes(context.role)) return true;
  if (context.role === "sales_rep") {
    return !deal.assigned_to_id || deal.assigned_to_id === context.userId;
  }
  return false;
}

export function canMoveDeal(
  context: AuthContext,
  deal: { assigned_to_id?: string | null; organization_id: string }
): boolean {
  return canEditDeal(context, deal);
}

export function canDeleteDeal(
  context: AuthContext,
  deal: { organization_id: string }
): boolean {
  if (deal.organization_id !== context.organizationId) return false;
  return ["owner", "admin"].includes(context.role);
}

/**
 * AI Sales Copilot Permissions
 */
export function canTriggerAiAnalysis(context: AuthContext): boolean {
  return ["owner", "admin", "sales_rep"].includes(context.role);
}

/**
 * Export Permissions
 */
export function canExportData(context: AuthContext): boolean {
  return ["owner", "admin"].includes(context.role);
}

/**
 * Member Management Permissions
 */
export function canManageMembers(context: AuthContext): boolean {
  return ["owner", "admin"].includes(context.role);
}

export function canAssignRoles(
  context: AuthContext,
  targetRole: UserRole
): boolean {
  if (context.role === "owner") return true;
  if (context.role === "admin") {
    // Admin cannot create/assign owner role
    return targetRole !== "owner";
  }
  return false;
}

/**
 * API Key Management Permissions
 */
export function canManageApiKeys(context: AuthContext): boolean {
  return ["owner", "admin"].includes(context.role);
}

/**
 * Audit Log Permissions
 */
export function canViewAuditLogs(context: AuthContext): boolean {
  return ["owner", "admin"].includes(context.role);
}

/**
 * Organization Settings Permissions
 */
export function canManageOrganization(context: AuthContext): boolean {
  return ["owner", "admin"].includes(context.role);
}

export function canManageBilling(context: AuthContext): boolean {
  return context.role === "owner";
}
