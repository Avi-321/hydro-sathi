/**
 * eSewa (ePay v2) and Khalti (ePayment v2) integration helpers.
 * Payment success is NEVER trusted from the browser — it is confirmed only by
 * the server-side status/lookup call in verifyEsewa / verifyKhalti.
 */
import crypto from "node:crypto";
import { config } from "../config.js";

/* ------------------------------- eSewa ---------------------------------- */

export function esewaSignature(fields) {
  // eSewa v2 signs: total_amount,transaction_uuid,product_code (in that order)
  const message = `total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${fields.product_code}`;
  return crypto.createHmac("sha256", config.esewa.secretKey).update(message).digest("base64");
}

export function buildEsewaPayload({ amount, transactionUuid, successUrl, failureUrl }) {
  const total = Number(amount).toFixed(2);
  const fields = {
    amount: total,
    tax_amount: "0",
    total_amount: total,
    transaction_uuid: transactionUuid,
    product_code: config.esewa.merchantCode,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };
  return { formUrl: config.esewa.formUrl, fields: { ...fields, signature: esewaSignature(fields) } };
}

/** Server-side status check — the only source of truth for eSewa payments. */
export async function verifyEsewa({ transactionUuid, totalAmount }) {
  const url = `${config.esewa.statusUrl}?product_code=${encodeURIComponent(config.esewa.merchantCode)}&total_amount=${Number(totalAmount).toFixed(2)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const raw = await res.json().catch(() => ({}));
  return {
    ok: res.ok && raw.status === "COMPLETE",
    status: raw.status ?? "UNKNOWN",
    providerTxnId: raw.ref_id ?? null,
    amount: raw.total_amount != null ? Number(raw.total_amount) : null,
    raw,
  };
}

/* ------------------------------- Khalti --------------------------------- */

export async function initiateKhalti({ amountNpr, orderNumber, returnUrl, websiteUrl, customer }) {
  const res = await fetch(`${config.khalti.baseUrl}/epayment/initiate/`, {
    method: "POST",
    headers: { Authorization: `Key ${config.khalti.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: Math.round(Number(amountNpr) * 100), // paisa
      purchase_order_id: orderNumber,
      purchase_order_name: `Hydro Sathi order ${orderNumber}`,
      customer_info: customer,
    }),
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok || !raw.payment_url) {
    throw new Error(`Khalti initiate failed: ${JSON.stringify(raw).slice(0, 300)}`);
  }
  return { paymentUrl: raw.payment_url, pidx: raw.pidx, raw };
}

/** Server-side lookup — the only source of truth for Khalti payments. */
export async function verifyKhalti({ pidx }) {
  const res = await fetch(`${config.khalti.baseUrl}/epayment/lookup/`, {
    method: "POST",
    headers: { Authorization: `Key ${config.khalti.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pidx }),
  });
  const raw = await res.json().catch(() => ({}));
  return {
    ok: res.ok && raw.status === "Completed",
    status: raw.status ?? "UNKNOWN",
    providerTxnId: raw.transaction_id ?? null,
    amount: raw.total_amount != null ? Number(raw.total_amount) / 100 : null,
    raw,
  };
}
