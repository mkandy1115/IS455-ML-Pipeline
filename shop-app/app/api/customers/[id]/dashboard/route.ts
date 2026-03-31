import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch all orders for this customer with shipment info
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select(`
      order_id, order_datetime, order_total, is_fraud, payment_method,
      shipments (late_delivery, actual_days, promised_days)
    `)
    .eq("customer_id", id)
    .order("order_datetime", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderCount = orders?.length ?? 0;
  const totalSpend = orders?.reduce((sum, o) => sum + o.order_total, 0) ?? 0;
  const lateDeliveries = orders?.filter((o) => (o.shipments as any)?.late_delivery === 1).length ?? 0;
  const lastOrder = orders?.[0] ?? null;

  return NextResponse.json({
    order_count: orderCount,
    total_spend: parseFloat(totalSpend.toFixed(2)),
    late_deliveries: lateDeliveries,
    last_order: lastOrder,
    recent_orders: orders?.slice(0, 5) ?? [],
  });
}
