import { NextResponse, type NextRequest } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import { eventIdSchema } from "@/lib/validations/event";
import {
  generateBudgetCsv,
  generateExportFilename,
  createCsvAttachmentResponse,
} from "@/lib/export-csv";

/**
 * GET /api/events/[id]/export/budget
 *
 * Secure Route Handler for downloading authoritative budget items as an RFC 4180 CSV file.
 *
 * Security & Authorization:
 * 1. Authenticates session via server-side getAuthenticatedUser(). Rejects with 401 if unauthenticated.
 * 2. Validates event UUID format via eventIdSchema. Rejects with 400 if invalid.
 * 3. Enforces event ownership: queries public.events where id = eventId AND user_id = user.id.
 *    Returns 404 if event is not found or owned by another tenant (preventing ID enumeration).
 * 4. Queries budget items scoped strictly to event_id and user_id, backed by PostgreSQL RLS.
 * 5. Uses saved authoritative ledger items only; completely ignores any uncommitted what-if simulator state.
 * 6. Generates deterministic RFC 4180 CSV with decimal-safe variance, formula protection, and UTF-8 BOM.
 * 7. Returns Response with Content-Disposition attachment, sanitized filename, and private no-store cache headers.
 * 8. Strictly read-only: performs zero mutations.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to export budget data." },
        { status: 401 }
      );
    }

    // 2. Validate event UUID format
    const idParse = eventIdSchema.safeParse(id);
    if (!idParse.success) {
      return NextResponse.json(
        { error: "Invalid event ID format." },
        { status: 400 }
      );
    }

    const eventId = idParse.data;
    const supabase = await createClient();

    // 3. Verify event ownership via canonical getEventById (prevents cross-tenant access)
    const eventResult = await getEventById(eventId);
    if (!eventResult.success) {
      return NextResponse.json(
        { error: "Event not found or access denied." },
        { status: 404 }
      );
    }
    const event = eventResult.data;

    // 4. Query authoritative saved budget records belonging strictly to this event and owner
    const { data: items, error: itemsError } = await supabase
      .from("budget_items")
      .select("*")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .order("category", { ascending: true })
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("[export/budget] Database query error:", itemsError.message);
      return NextResponse.json(
        { error: "Failed to retrieve budget items for export." },
        { status: 500 }
      );
    }

    // 5. Generate RFC 4180 CSV with formula protection, decimal variance, and UTF-8 BOM
    const csvContent = generateBudgetCsv(items ?? []);
    const filename = generateExportFilename(event.name, "budget");

    // 6. Return downloadable attachment response with strict cache controls
    return createCsvAttachmentResponse(csvContent, filename);
  } catch (error) {
    console.error("[export/budget] Unexpected failure:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while exporting budget items." },
      { status: 500 }
    );
  }
}
