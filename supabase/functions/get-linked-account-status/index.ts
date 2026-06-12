import { assertAdminUser } from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import { fetchLinkedAccount } from "../_shared/razorpay.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    await assertAdminUser(user.id);

    const admin = getServiceClient();
    const { data: row, error } = await admin
      .from("agency_razorpay_accounts")
      .select("*")
      .eq("agency_id", user.id)
      .maybeSingle();

    if (error?.code === "42P01") {
      return jsonResponse({ status: "not_started" });
    }

    if (error) {
      throw new Error(error.message);
    }

    if (!row) {
      return jsonResponse({ status: "not_started" });
    }

    if (row.razorpay_account_id && row.status !== "active") {
      try {
        const rz = await fetchLinkedAccount(row.razorpay_account_id);
        const mapped = mapRazorpayStatus(String(rz.status ?? row.status));
        if (mapped !== row.status) {
          await admin
            .from("agency_razorpay_accounts")
            .update({ status: mapped, updated_at: new Date().toISOString() })
            .eq("id", row.id);
          row.status = mapped;
        }
      } catch (pollError) {
        console.warn("Linked account poll failed:", pollError);
      }
    }

    return jsonResponse({
      status: row.status,
      accountId: row.razorpay_account_id,
      businessName: row.business_name,
      rejectionReason: row.rejection_reason,
      defaultCollectionMethod: row.default_collection_method,
      allowCashCollection: row.allow_cash_collection,
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});

function mapRazorpayStatus(status: string): string {
  switch (status) {
    case "activated":
      return "active";
    case "suspended":
      return "suspended";
    case "rejected":
      return "rejected";
    case "under_review":
      return "under_review";
    default:
      return "created";
  }
}
