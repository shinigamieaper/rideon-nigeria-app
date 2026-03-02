export interface CreatePaystackRefundParams {
  transaction: string | number;
  amountKobo?: number;
}

export interface PaystackRefundResponse {
  status: boolean;
  message?: string;
  data?: any;
}

export async function createPaystackRefund(
  params: CreatePaystackRefundParams,
): Promise<PaystackRefundResponse> {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
  }

  const transaction =
    typeof params.transaction === "number"
      ? params.transaction
      : String(params.transaction).trim();
  if (!transaction) {
    throw new Error("Missing transaction");
  }

  const payload: Record<string, any> = { transaction };
  if (
    typeof params.amountKobo === "number" &&
    Number.isFinite(params.amountKobo) &&
    params.amountKobo > 0
  ) {
    payload.amount = Math.round(params.amountKobo);
  }

  const resp = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = (await resp
    .json()
    .catch(() => null)) as PaystackRefundResponse | null;
  if (!resp.ok || !json) {
    const message =
      (json as any)?.message || `Paystack refund failed (${resp.status})`;
    throw new Error(message);
  }

  if (!json.status) {
    throw new Error(json.message || "Paystack refund failed");
  }

  return json;
}
