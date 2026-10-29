import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Use HTTP 303 (See Other) so POST redirects to GET /sign-in
  return NextResponse.redirect(new URL("/sign-in", request.url), 303);
}
