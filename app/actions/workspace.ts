"use server";

import { cookies } from "next/headers";
import { getSession, verifyAndSwitchWorkspace, DEMO_USERS } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function switchWorkspaceAction(targetOrgId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user actually belongs to target organization in DB
    await verifyAndSwitchWorkspace(session.userId, targetOrgId);

    // Set cookie
    cookies().set("pulse_active_org_id", targetOrgId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to switch workspace",
    };
  }
}

export async function switchDemoUserAction(demoUserId: string) {
  try {
    const targetUser = DEMO_USERS.find((u) => u.id === demoUserId);
    if (!targetUser) {
      return { success: false, error: "Invalid demo user profile" };
    }

    cookies().set("pulse_demo_user_id", demoUserId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    // Reset active workspace to user's native organization
    cookies().set("pulse_active_org_id", targetUser.orgId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to switch user",
    };
  }
}

export async function logoutAction() {
  cookies().delete("pulse_demo_user_id");
  cookies().delete("pulse_active_org_id");
  revalidatePath("/");
  return { success: true };
}
