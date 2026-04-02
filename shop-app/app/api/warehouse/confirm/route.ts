import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const { order_id, confirmed_fraud } = await req.json();

  if (order_id === undefined || confirmed_fraud === undefined) {
    return NextResponse.json({ error: "order_id and confirmed_fraud are required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ confirmed_fraud })
    .eq("order_id", order_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
