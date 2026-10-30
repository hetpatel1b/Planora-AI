/**
 * Planora AI — Shared Action Response Contracts
 *
 * Standard typed action response envelope for Server Actions and mutations.
 */

export type ActionResult<T> =
  | {
      success: true;
      data: T;
      error?: never;
      fieldErrors?: never;
    }
  | {
      success: false;
      data?: never;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };
