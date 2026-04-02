import { supabaseAdmin } from "@/lib/supabase";

/**
 * Calls the Python scoring service (FastAPI on Render).
 * If ML_API_URL is not set, generates random stub scores directly in Supabase
 * so the warehouse page works before the scoring service is deployed.
 */
export async function runScoringJob(): Promise<void> {
  const mlApiUrl = process.env.ML_API_URL;

  if (mlApiUrl) {
    // Real path: call the Python scoring service
    const res = await fetch(`${mlApiUrl}/score`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Scoring service error ${res.status}: ${text}`);
    }
    // Scoring service writes risk_score directly to Supabase — nothing to do here
    return;
  }

  // Stub path: write random fraud scores to orders.risk_score in Supabase
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("order_id")
    .limit(500);

  if (error) throw new Error(error.message);

  // Update in batches to avoid rate limits
  const updates = (orders ?? []).map((o) => {
    const risk_score = parseFloat((Math.random() * 100).toFixed(2));
    return supabaseAdmin
      .from("orders")
      .update({ risk_score, predicted_fraud: risk_score >= 50 ? 1 : 0 })
      .eq("order_id", o.order_id);
  });

  await Promise.all(updates);
}
