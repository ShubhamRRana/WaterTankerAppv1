/**
 * Edge Function: admin-create-driver
 *
 * Creates a driver account using the Admin API so no confirmation email is sent.
 * This avoids Supabase's "email rate limit exceeded" when admins create multiple drivers.
 *
 * Caller must be authenticated as admin (JWT in Authorization header).
 * Body: { email, password, name, phone, licenseNumber?, licenseExpiry?, emergencyContactName?, emergencyContactPhone?, vehicleNumber? }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return jsonResponse({ error: "Only admins can create driver accounts" }, 403);
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!email || !password || !name || !phone) {
      return jsonResponse({ error: "email, password, name, and phone are required" }, 400);
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "driver", phone },
    });

    if (createError) {
      const msg = createError.message || "Failed to create user";
      return jsonResponse({ error: msg }, 400);
    }
    if (!newUser.user) {
      return jsonResponse({ error: "User creation failed" }, 500);
    }

    const userId = newUser.user.id;
    await new Promise<void>((resolve) => setTimeout(resolve, 400));

    const licenseExpiry = body.licenseExpiry != null
      ? (typeof body.licenseExpiry === "string"
        ? body.licenseExpiry
        : (body.licenseExpiry instanceof Date ? body.licenseExpiry.toISOString().split("T")[0] : new Date().toISOString().split("T")[0]))
      : new Date().toISOString().split("T")[0];

    const { error: driverError } = await supabase.from("drivers").upsert({
      user_id: userId,
      vehicle_number: body.vehicleNumber ?? "",
      license_number: body.licenseNumber ?? "",
      license_expiry: licenseExpiry,
      driver_license_image_url: body.driverLicenseImage ?? "",
      vehicle_registration_image_url: body.vehicleRegistrationImage ?? "",
      total_earnings: 0,
      completed_orders: 0,
      created_by_admin: true,
      created_by_admin_id: adminUser.id,
      emergency_contact_name: body.emergencyContactName ?? null,
      emergency_contact_phone: body.emergencyContactPhone ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (driverError) {
      return jsonResponse({ error: "Driver profile creation failed: " + driverError.message }, 500);
    }

    return jsonResponse({ success: true, user_id: userId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
