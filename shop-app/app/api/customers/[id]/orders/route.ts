import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      order_id, order_datetime, order_total, payment_method, device_type,
      is_fraud, risk_score,
      shipments (shipment_id, carrier, shipping_method, promised_days, actual_days, late_delivery)
    `)
    .eq("customer_id", id)
    .order("order_datetime", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
