import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const checks: Array<{ table: string; columns: string[]; sql: string }> = [
    {
      table: "authors",
      columns: ["religious_tradition", "profile_url"],
      sql: "ALTER TABLE authors ADD COLUMN IF NOT EXISTS religious_tradition text;\nALTER TABLE authors ADD COLUMN IF NOT EXISTS profile_url text;",
    },
    {
      table: "recommendations",
      columns: ["thriftbooks_price"],
      sql: "ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS thriftbooks_price numeric;",
    },
  ];

  const missing: string[] = [];

  for (const check of checks) {
    const { error } = await supabaseAdmin
      .from(check.table)
      .select(check.columns.join(","))
      .limit(1);
    if (error) {
      missing.push(check.sql);
    }
  }

  if (missing.length > 0) {
    return NextResponse.json({
      success: false,
      message: "Missing columns. Please run this SQL in Supabase SQL Editor:\n\n" + missing.join("\n"),
    });
  }

  return NextResponse.json({ success: true, message: "All columns exist" });
}
