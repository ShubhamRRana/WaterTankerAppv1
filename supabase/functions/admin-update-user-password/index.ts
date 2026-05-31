/**
 * Edge Function: admin-update-user-password
 *
 * Updates a driver's Supabase Auth password. Caller must be an admin who created the driver.
 *
 * Body: { userId: string, password: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_PASSWORD_LENGTH = 6;

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !adminUser) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", adminUser.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin") ?? false;
    if (!isAdmin) {
      return jsonResponse({ error: "Only admins can update driver passwords" }, 403);
    }

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!userId || !password) {
      return jsonResponse({ error: "userId and password are required" }, 400);
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
    }

    const { data: driverRow, error: driverError } = await supabase
      .from("drivers")
      .select("user_id, created_by_admin_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (driverError || !driverRow) {
      return jsonResponse({ error: "Driver not found" }, 404);
    }

    if (driverRow.created_by_admin_id !== adminUser.id) {
      return jsonResponse(
        { error: "You can only update passwords for drivers you created" },
        403
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });

    if (updateError) {
      return jsonResponse({ error: updateError.message || "Failed to update password" }, 400);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
