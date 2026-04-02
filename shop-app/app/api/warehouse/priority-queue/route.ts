import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      order_id, order_datetime, order_total, payment_method, device_type,
      ip_country, risk_score, predicted_fraud, confirmed_fraud,
      customers (customer_id, full_name, city, state, loyalty_tier),
      shipments (carrier, shipping_method, promised_days, actual_days, late_delivery)
    `)
    .gt("risk_score", 0)
    .order("risk_score", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
