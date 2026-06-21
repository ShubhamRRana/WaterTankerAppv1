/**
 * Edge Function: admin-delete-user
 *
 * Deletes a Supabase Auth user after app data has been removed from the database.
 * Caller must be authenticated as admin (deleting another user) or deleting their own account.
 *
 * Body: { userId: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
  }

  const supabase = getServiceClient();
  if (!Deno.env.get("SUPABASE_URL")) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !caller) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId) {
      return jsonResponse({ error: "userId is required" }, 400);
    }

    const isSelfDelete = caller.id === userId;
    if (!isSelfDelete) {
      const { data: callerRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id);
      const isAdmin = callerRoles?.some((r: { role: string }) => r.role === "admin") ?? false;
      if (!isAdmin) {
        return jsonResponse({ error: "Only admins can delete other users" }, 403);
      }
    }

    const { data: remainingRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      return jsonResponse({ error: "Failed to check user roles" }, 500);
    }

    if (remainingRoles && remainingRoles.length > 0) {
      return jsonResponse({
        success: true,
        auth_deleted: false,
        reason: "User still has app roles; auth account kept",
      });
    }

    const { data: userRow, error: usersError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (usersError) {
      return jsonResponse({ error: "Failed to check user profile" }, 500);
    }

    if (userRow) {
      return jsonResponse({
        success: true,
        auth_deleted: false,
        reason: "User profile still exists; auth account kept",
      });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      const message = deleteError.message || "Failed to delete auth user";
      const alreadyDeleted =
        message.toLowerCase().includes("not found") ||
        message.toLowerCase().includes("user not found");
      if (alreadyDeleted) {
        return jsonResponse({ success: true, auth_deleted: true, reason: "Auth user already removed" });
      }
      return jsonResponse({ error: message }, 400);
    }

    return jsonResponse({ success: true, auth_deleted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
