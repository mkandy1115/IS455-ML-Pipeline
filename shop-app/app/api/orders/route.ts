import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    customer_id,
    payment_method,
    device_type = "desktop",
    ip_country = "US",
    promo_used = 0,
    promo_code = null,
    billing_zip = null,
    shipping_zip = null,
    shipping_state = null,
    items, // [{ product_id, quantity }]
  } = body;

  if (!customer_id || !payment_method || !items?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Fetch product prices
  const productIds = items.map((i: any) => i.product_id);
  const { data: products, error: productError } = await supabaseAdmin
    .from("products")
    .select("product_id, price")
    .in("product_id", productIds);

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  const priceMap = Object.fromEntries(products!.map((p) => [p.product_id, p.price]));

  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (priceMap[item.product_id] ?? 0) * item.quantity;
  }, 0);

  const shippingFee = 5.99;
  const taxAmount = parseFloat((subtotal * 0.08).toFixed(2));
  const orderTotal = parseFloat((subtotal + shippingFee + taxAmount).toFixed(2));

  // Insert order
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      customer_id,
      order_datetime: new Date().toISOString(),
      payment_method,
      device_type,
      ip_country,
      promo_used,
      promo_code,
      billing_zip,
      shipping_zip,
      shipping_state,
      order_subtotal: parseFloat(subtotal.toFixed(2)),
      shipping_fee: shippingFee,
      tax_amount: taxAmount,
      order_total: orderTotal,
      risk_score: 0,
      is_fraud: 0,
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // Insert order items
  const orderItems = items.map((item: any) => ({
    order_id: order.order_id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: priceMap[item.product_id],
    line_total: parseFloat((priceMap[item.product_id] * item.quantity).toFixed(2)),
  }));

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({ order, items: orderItems }, { status: 201 });
}
