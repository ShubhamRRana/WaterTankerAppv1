import { assertAdminUser } from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import { createLinkedAccount } from "../_shared/razorpay.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    await assertAdminUser(user.id);

    const body = await req.json().catch(() => ({}));
    const businessName = typeof body.businessName === "string"
      ? body.businessName.trim()
      : "";
    const contactEmail = typeof body.contactEmail === "string"
      ? body.contactEmail.trim()
      : "";
    const contactPhone = typeof body.contactPhone === "string"
      ? body.contactPhone.trim()
      : "";
    const contactName = typeof body.contactName === "string"
      ? body.contactName.trim()
      : "";
    const pan = typeof body.pan === "string" ? body.pan.trim() : "";
    const bankAccountNumber = typeof body.bankAccountNumber === "string"
      ? body.bankAccountNumber.trim()
      : "";
    const bankIfsc = typeof body.bankIfsc === "string" ? body.bankIfsc.trim() : "";

    if (!businessName || !contactEmail || !contactPhone) {
      return errorResponse("businessName, contactEmail, and contactPhone are required", 400);
    }

    const admin = getServiceClient();
    const agencyId = user.id;

    const { data: existing } = await admin
      .from("agency_razorpay_accounts")
      .select("id, razorpay_account_id, status")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (existing?.status === "active" && existing.razorpay_account_id) {
      return jsonResponse({
        accountId: existing.razorpay_account_id,
        status: existing.status,
        alreadyActive: true,
      });
    }

    const accountPayload = {
      email: contactEmail,
      phone: contactPhone,
      type: "route",
      legal_business_name: businessName,
      business_type: "individual",
      contact_name: contactName || businessName,
      notes: { agency_id: agencyId },
    };

    const rzAccount = await createLinkedAccount(accountPayload);
    const accountId = String(rzAccount.id ?? "");
    const rzStatus = mapRazorpayStatus(String(rzAccount.status ?? "created"));

    const row = {
      agency_id: agencyId,
      razorpay_account_id: accountId || null,
      status: rzStatus,
      business_name: businessName,
      contact_name: contactName || businessName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      pan: pan || null,
      bank_account_number: bankAccountNumber || null,
      bank_ifsc: bankIfsc || null,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await admin.from("agency_razorpay_accounts").update(row).eq("id", existing.id);
    } else {
      await admin.from("agency_razorpay_accounts").insert(row);
    }

    return jsonResponse({
      accountId,
      status: rzStatus,
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
