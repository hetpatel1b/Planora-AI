import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // CSRF Defense: Validate Origin and Referer headers against the host origin
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const expectedOrigin = request.nextUrl.origin;

  if (origin && origin !== expectedOrigin) {
    return NextResponse.json(
      { error: "Invalid request origin. Cross-Site Request Forgery (CSRF) blocked." },
      { status: 403 }
    );
  }

  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== expectedOrigin) {
        return NextResponse.json(
          { error: "Invalid request referer. Cross-Site Request Forgery (CSRF) blocked." },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Malformed referer header." },
        { status: 403 }
      );
    }
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  // Use HTTP 303 (See Other) so POST redirects to GET /sign-in
  return NextResponse.redirect(new URL("/sign-in", request.url), 303);
}
