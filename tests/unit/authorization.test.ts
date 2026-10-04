import { describe, it, expect } from "vitest";
import {
  canCreateContact,
  canEditContact,
  canDeleteContact,
  canCreateDeal,
  canMoveDeal,
  canDeleteDeal,
  canExportData,
  canManageMembers,
  canManageApiKeys,
  AuthContext,
} from "@/lib/authorization";

describe("RBAC Authorization Engine Unit Tests", () => {
  const orgA = "11111111-1111-1111-1111-111111111111";
  const orgB = "22222222-2222-2222-2222-222222222222";

  const ownerContext: AuthContext = {
    userId: "u-owner",
    organizationId: orgA,
    role: "owner",
    status: "active",
  };

  const adminContext: AuthContext = {
    userId: "u-admin",
    organizationId: orgA,
    role: "admin",
    status: "active",
  };

  const salesRepContext: AuthContext = {
    userId: "u-rep-1",
    organizationId: orgA,
    role: "sales_rep",
    status: "active",
  };

  const viewerContext: AuthContext = {
    userId: "u-viewer",
    organizationId: orgA,
    role: "viewer",
    status: "active",
  };

  describe("Contact Permissions", () => {
    it("allows owner, admin, and sales rep to create contacts; denies viewer", () => {
      expect(canCreateContact(ownerContext)).toBe(true);
      expect(canCreateContact(adminContext)).toBe(true);
      expect(canCreateContact(salesRepContext)).toBe(true);
      expect(canCreateContact(viewerContext)).toBe(false);
    });

    it("allows sales rep to edit their assigned contact", () => {
      const ownContact = { assigned_to_id: "u-rep-1", organization_id: orgA };
      expect(canEditContact(salesRepContext, ownContact)).toBe(true);
    });

    it("denies sales rep from editing contacts assigned to another rep", () => {
      const otherContact = { assigned_to_id: "u-rep-2", organization_id: orgA };
      expect(canEditContact(salesRepContext, otherContact)).toBe(false);
    });

    it("denies all operations on contacts from another organization (cross-tenant)", () => {
      const foreignContact = { assigned_to_id: "u-owner", organization_id: orgB };
      expect(canEditContact(ownerContext, foreignContact)).toBe(false);
      expect(canDeleteContact(ownerContext, foreignContact)).toBe(false);
    });

    it("restricts contact deletion to owner and admin only", () => {
      const contact = { organization_id: orgA };
      expect(canDeleteContact(ownerContext, contact)).toBe(true);
      expect(canDeleteContact(adminContext, contact)).toBe(true);
      expect(canDeleteContact(salesRepContext, contact)).toBe(false);
      expect(canDeleteContact(viewerContext, contact)).toBe(false);
    });
  });

  describe("Deal Permissions", () => {
    it("allows sales rep to move own deal in Kanban; denies other rep's deal", () => {
      const ownDeal = { assigned_to_id: "u-rep-1", organization_id: orgA };
      const otherDeal = { assigned_to_id: "u-rep-2", organization_id: orgA };

      expect(canMoveDeal(salesRepContext, ownDeal)).toBe(true);
      expect(canMoveDeal(salesRepContext, otherDeal)).toBe(false);
    });

    it("allows admin and owner to move any deal in the tenant", () => {
      const anyDeal = { assigned_to_id: "u-rep-2", organization_id: orgA };
      expect(canMoveDeal(adminContext, anyDeal)).toBe(true);
      expect(canMoveDeal(ownerContext, anyDeal)).toBe(true);
    });

    it("restricts deal deletion to owner and admin", () => {
      const deal = { organization_id: orgA };
      expect(canDeleteDeal(ownerContext, deal)).toBe(true);
      expect(canDeleteDeal(adminContext, deal)).toBe(true);
      expect(canDeleteDeal(salesRepContext, deal)).toBe(false);
    });
  });

  describe("Administrative Capabilities", () => {
    it("restricts export to owner and admin", () => {
      expect(canExportData(ownerContext)).toBe(true);
      expect(canExportData(adminContext)).toBe(true);
      expect(canExportData(salesRepContext)).toBe(false);
      expect(canExportData(viewerContext)).toBe(false);
    });

    it("restricts API key management to owner and admin", () => {
      expect(canManageApiKeys(ownerContext)).toBe(true);
      expect(canManageApiKeys(adminContext)).toBe(true);
      expect(canManageApiKeys(salesRepContext)).toBe(false);
      expect(canManageApiKeys(viewerContext)).toBe(false);
    });

    it("restricts team member management to owner and admin", () => {
      expect(canManageMembers(ownerContext)).toBe(true);
      expect(canManageMembers(adminContext)).toBe(true);
      expect(canManageMembers(salesRepContext)).toBe(false);
    });
  });
});
