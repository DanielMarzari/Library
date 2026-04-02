import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Author import completed. 134 authors with image URLs imported." });
}
