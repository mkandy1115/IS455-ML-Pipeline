import { NextRequest, NextResponse } from "next/server";
import { runScoringJob } from "@/lib/scoring";

// Called automatically by Vercel Cron on the schedule defined in vercel.json.
// Vercel sends Authorization: Bearer <CRON_SECRET> with every cron request.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runScoringJob();
    return NextResponse.json({ ok: true, scored_at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
