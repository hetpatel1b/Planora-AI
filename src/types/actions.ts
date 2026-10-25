/**
 * Planora AI — Shared Action Response Contracts
 *
 * Standard typed action response envelope for Server Actions and mutations.
 */

export type ActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };
