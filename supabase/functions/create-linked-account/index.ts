import { assertAdminUser, assertAgencySubscriptionActive, AgencySubscriptionInactiveError } from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import {
  createLinkedAccountStakeholder,
  createOrReuseLinkedAccount,
  isStakeholderAlreadyExistsError,
  mapRazorpayRouteError,
  requestRouteProduct,
  updateRouteProductSettlement,
} from "../_shared/razorpay.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/supabase.ts";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

/** Razorpay reference_id max 20 chars; suffix must not be truncated off the end. */
function routeReferenceId(agencyId: string, suffix = ""): string {
  const base = agencyId.replace(/-/g, "");
  if (!suffix) return base.slice(0, 20);
  const maxBaseLen = Math.max(1, 20 - suffix.length);
  return `${base.slice(0, maxBaseLen)}${suffix}`;
}

async function persistLinkedAccountProgress(
  admin: ReturnType<typeof getServiceClient>,
  agencyId: string,
  existingId: string | undefined,
  row: Record<string, unknown>
): Promise<void> {
  const payload = { ...row, updated_at: new Date().toISOString() };
  if (existingId) {
    await admin.from("agency_razorpay_accounts").update(payload).eq("id", existingId);
    return;
  }
  await admin.from("agency_razorpay_accounts").insert(payload);
}

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
    await assertAgencySubscriptionActive(user.id);

    const body = await req.json().catch(() => ({}));
    const businessName = typeof body.businessName === "string"
      ? body.businessName.trim()
      : "";
    const contactEmail = typeof body.contactEmail === "string"
      ? body.contactEmail.trim()
      : "";
    const contactPhone = typeof body.contactPhone === "string"
      ? normalizePhone(body.contactPhone.trim())
      : "";
    const contactName = typeof body.contactName === "string"
      ? body.contactName.trim()
      : "";
    const pan = typeof body.pan === "string" ? body.pan.trim().toUpperCase() : "";
    const bankAccountNumber = typeof body.bankAccountNumber === "string"
      ? body.bankAccountNumber.trim()
      : "";
    const bankIfsc = typeof body.bankIfsc === "string"
      ? body.bankIfsc.trim().toUpperCase()
      : "";
    const registeredStreet = typeof body.registeredStreet === "string"
      ? body.registeredStreet.trim()
      : "";
    const registeredStreet2 = typeof body.registeredStreet2 === "string"
      ? body.registeredStreet2.trim()
      : "";
    const registeredCity = typeof body.registeredCity === "string"
      ? body.registeredCity.trim()
      : "";
    const registeredState = typeof body.registeredState === "string"
      ? body.registeredState.trim()
      : "";
    const registeredPostalCode = typeof body.registeredPostalCode === "string"
      ? body.registeredPostalCode.trim()
      : "";

    if (!businessName || !contactName || !contactEmail || !contactPhone) {
      return errorResponse(
        "businessName, contactName (as on PAN), contactEmail, and contactPhone are required",
        400
      );
    }
    if (contactPhone.length !== 10) {
      return errorResponse("contactPhone must be a valid 10-digit Indian mobile number", 400);
    }
    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return errorResponse("A valid PAN is required for Razorpay Route KYC", 400);
    }
    if (!bankAccountNumber || !bankIfsc) {
      return errorResponse("Bank account number and IFSC are required", 400);
    }
    if (!registeredStreet || !registeredCity || !registeredState || !registeredPostalCode) {
      return errorResponse(
        "Registered business address (street, city, state, PIN) is required",
        400
      );
    }
    if (!/^\d{6}$/.test(registeredPostalCode)) {
      return errorResponse("registeredPostalCode must be a 6-digit PIN code", 400);
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

    // Reuse an in-progress linked account so retries continue stakeholder/KYC steps
    // instead of failing with "merchant email already exists".
    let accountId = existing?.status === "rejected"
      ? ""
      : (existing?.razorpay_account_id ?? "");
    let rzStatus = existing?.status ?? "created";
    const referenceId = routeReferenceId(
      agencyId,
      accountId ? "" : String(Date.now()).slice(-8)
    );

    if (!accountId) {
      const rzAccount = await createOrReuseLinkedAccount({
        email: contactEmail,
        phone: contactPhone,
        legalBusinessName: businessName,
        contactName,
        referenceId,
        pan,
        registeredStreet,
        registeredStreet2: registeredStreet2 || undefined,
        registeredCity,
        registeredState,
        registeredPostalCode,
        notes: { agency_id: agencyId },
      });
      accountId = String(rzAccount.id ?? "");
      rzStatus = mapRazorpayStatus(String(rzAccount.status ?? "created"));

      await persistLinkedAccountProgress(admin, agencyId, existing?.id, {
        agency_id: agencyId,
        razorpay_account_id: accountId || null,
        status: rzStatus,
        business_name: businessName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        pan: pan || null,
        bank_account_number: bankAccountNumber || null,
        bank_ifsc: bankIfsc || null,
      });
    }

    const residentialStreet = registeredStreet2
      ? `${registeredStreet}, ${registeredStreet2}`
      : registeredStreet;

    if (accountId) {
      try {
        try {
          await createLinkedAccountStakeholder({
            accountId,
            name: contactName,
            email: contactEmail,
            phone: contactPhone,
            pan,
            street: residentialStreet,
            city: registeredCity,
            state: registeredState,
            postalCode: registeredPostalCode,
          });
        } catch (stakeholderErr) {
          const stakeholderMessage = stakeholderErr instanceof Error
            ? stakeholderErr.message
            : "";
          if (!isStakeholderAlreadyExistsError(stakeholderMessage)) {
            throw stakeholderErr;
          }
        }

        const product = await requestRouteProduct(accountId);
        const productId = String(product.id ?? "");
        if (productId) {
          await updateRouteProductSettlement(accountId, productId, {
            accountNumber: bankAccountNumber,
            ifsc: bankIfsc,
            beneficiaryName: contactName,
          });
          if (rzStatus === "created") {
            rzStatus = "under_review";
          }
        }
      } catch (routeErr) {
        const message = routeErr instanceof Error ? routeErr.message : "Route setup failed";
        throw new Error(message);
      }
    }

    const row = {
      agency_id: agencyId,
      razorpay_account_id: accountId || null,
      status: rzStatus,
      business_name: businessName,
      contact_name: contactName,
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
    if (e instanceof AgencySubscriptionInactiveError) {
      return errorResponse(e.message, 403, { code: e.code });
    }
    const message = e instanceof Error
      ? mapRazorpayRouteError(e.message)
      : "Internal error";
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
