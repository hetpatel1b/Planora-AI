import type { Json } from "@/types/database.types";

/**
 * Planora AI — JSON Type & Serialization Utilities
 *
 * Provides type-safe converters and runtime type guards for database JSON columns
 * and PostgreSQL RPC arguments. Resolves TypeScript index-signature variance between
 * strongly-typed application domain models and Supabase's recursive `Json` union,
 * completely eliminating the need for unsafe `as unknown as Json` double casts at call sites.
 */

export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: unknown }
  | readonly unknown[];

/**
 * Safely converts any JSON-serializable domain object or array into the database `Json` type.
 * Enforces at compile time that functions, symbols, and undefined are not accepted as root payloads.
 *
 * @param value - Serializable object, array, or primitive to pass into an RPC or JSON column.
 * @returns The value typed as Supabase `Json`.
 */
export function toJsonPayload<T extends SerializableValue>(value: T): Json {
  return value as unknown as Json;
}

/**
 * Checks whether an unknown value is a non-null plain JavaScript object (not an array or primitive).
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks whether an unknown value is a JSON array.
 */
export function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Safely parses a JSON string, returning a discriminated union result rather than throwing.
 */
export function safeJsonParse<T = unknown>(
  text: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON string";
    return { success: false, error: message };
  }
}

