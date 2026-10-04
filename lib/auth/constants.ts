import { UserRole } from "@/lib/authorization";

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  isDemoMode: boolean;
  avatarUrl?: string | null;
}

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  orgId: string;
  orgName: string;
  orgSlug: string;
}

export const DEMO_USERS: DemoUser[] = [
  // Apex Industrial Supplies (Tenant 1)
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "karim@apexsupplies.com",
    fullName: "Karim Al-Mansoor",
    role: "owner" as UserRole,
    orgId: "11111111-1111-1111-1111-111111111111",
    orgName: "Apex Industrial Supplies",
    orgSlug: "apex-industrial",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "nadia@apexsupplies.com",
    fullName: "Nadia El-Sayed",
    role: "admin" as UserRole,
    orgId: "11111111-1111-1111-1111-111111111111",
    orgName: "Apex Industrial Supplies",
    orgSlug: "apex-industrial",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "omar@apexsupplies.com",
    fullName: "Omar Farooq",
    role: "sales_rep" as UserRole,
    orgId: "11111111-1111-1111-1111-111111111111",
    orgName: "Apex Industrial Supplies",
    orgSlug: "apex-industrial",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "laila@apexsupplies.com",
    fullName: "Laila Mahmoud",
    role: "sales_rep" as UserRole,
    orgId: "11111111-1111-1111-1111-111111111111",
    orgName: "Apex Industrial Supplies",
    orgSlug: "apex-industrial",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: "tarek@apexsupplies.com",
    fullName: "Tarek Mostafa",
    role: "viewer" as UserRole,
    orgId: "11111111-1111-1111-1111-111111111111",
    orgName: "Apex Industrial Supplies",
    orgSlug: "apex-industrial",
  },
  // Horizon Logistics (Tenant 2 - Isolation Verification)
  {
    id: "00000000-0000-0000-0000-000000000006",
    email: "ziad@horizonlogistics.com",
    fullName: "Ziad Al-Hassan",
    role: "owner" as UserRole,
    orgId: "22222222-2222-2222-2222-222222222222",
    orgName: "Horizon Logistics",
    orgSlug: "horizon-logistics",
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    email: "sarah@horizonlogistics.com",
    fullName: "Sarah Nabil",
    role: "sales_rep" as UserRole,
    orgId: "22222222-2222-2222-2222-222222222222",
    orgName: "Horizon Logistics",
    orgSlug: "horizon-logistics",
  },
];
