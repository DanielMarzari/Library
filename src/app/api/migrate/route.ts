import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Add new columns if they don't exist
  // We use a raw query via rpc, or we just try inserting with the new columns
  // Since we can't run DDL via PostgREST, we'll use a workaround:
  // Try to read the column; if it fails, tell the user to add it manually

  // Test if columns exist
  const { error } = await supabaseAdmin
    .from("authors")
    .select("religious_tradition,profile_url")
    .limit(1);

  if (error) {
    return NextResponse.json({
      success: false,
      message: "Columns don't exist yet. Please run this SQL in Supabase SQL Editor:\n\nALTER TABLE authors ADD COLUMN IF NOT EXISTS religious_tradition text;\nALTER TABLE authors ADD COLUMN IF NOT EXISTS profile_url text;",
      error: error.message,
    });
  }

  return NextResponse.json({ success: true, message: "Columns already exist" });
}
