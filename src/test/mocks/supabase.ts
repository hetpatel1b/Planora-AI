import { vi } from "vitest";
import type { User, PostgrestError, UserResponse, AuthError } from "@supabase/supabase-js";

/**
 * Standard test user fixtures for authenticated action tests.
 */
export const MOCK_USER: User = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-01T00:00:00.000Z",
  email: "planner@planora.ai",
  role: "authenticated",
};

export const MOCK_OTHER_USER: User = {
  id: "999e4567-e89b-12d3-a456-426614174999",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-01T00:00:00.000Z",
  email: "intruder@example.com",
  role: "authenticated",
};

/**
 * Well-formed UUID fixtures for tests.
 */
export const TEST_IDS = {
  eventId: "11111111-1111-4111-8111-111111111111",
  otherEventId: "11111111-1111-4111-8111-999999999999",
  budgetItemId: "22222222-2222-4222-8222-222222222222",
  otherBudgetItemId: "22222222-2222-4222-8222-999999999999",
  taskId: "33333333-3333-4333-8333-333333333333",
  otherTaskId: "33333333-3333-4333-8333-999999999999",
  planRevisionId: "44444444-4444-4444-8444-444444444444",
};

export type MockError = PostgrestError | { message: string; code?: string };

/**
 * Creates a strongly-typed mock UserResponse representing a successful authentication check.
 */
export function createMockAuthSuccess(user: User = MOCK_USER): UserResponse {
  return {
    data: { user },
    error: null,
  } as unknown as UserResponse;
}

/**
 * Creates a strongly-typed mock UserResponse representing an unauthenticated or expired session.
 */
export function createMockAuthFailure(message = "Session expired", status = 401): UserResponse {
  return {
    data: { user: null },
    error: { message, name: "AuthError", status } as unknown as AuthError,
  } as unknown as UserResponse;
}

export interface MockQueryResult<T = unknown> {
  data: T | null;
  error: MockError | null;
}

export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: <TResult1 = MockQueryResult, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

/**
 * Creates a chainable mock Supabase query builder.
 * Implements thenable behavior on the returned builder object itself so that
 * queries without .single() (e.g. delete, list, order, limit) can be directly
 * awaited, while queries terminating with .single() resolve through .single().
 */
export function createMockQueryBuilder(result: MockQueryResult = { data: null, error: null }): MockQueryBuilder {
  const currentResult: MockQueryResult = {
    data: result.data !== undefined ? result.data : null,
    error: result.error !== undefined ? result.error : null,
  };

  const builder: MockQueryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
    single: vi.fn(),
    then: <TResult1 = MockQueryResult, TResult2 = never>(
      onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => {
      return Promise.resolve(currentResult).then(onfulfilled, onrejected);
    },
  };

  builder.select.mockImplementation(() => builder);
  builder.insert.mockImplementation(() => builder);
  builder.update.mockImplementation(() => builder);
  builder.delete.mockImplementation(() => builder);
  builder.eq.mockImplementation(() => builder);
  builder.order.mockImplementation(() => builder);
  builder.limit.mockImplementation(() => builder);
  builder.in.mockImplementation(() => builder);
  builder.single.mockImplementation(() => Promise.resolve(currentResult));

  return builder;
}

export interface MockSupabaseClientConfig {
  tables?: Record<string, MockQueryResult | MockQueryResult[]>;
  defaultData?: unknown;
  defaultError?: MockError | null;
  rpcData?: unknown;
  rpcError?: MockError | null;
  user?: User | null;
  authError?: MockError | null;
  signOutError?: MockError | null;
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  getBuilderForTable: (table: string) => MockQueryBuilder | undefined;
  getAllBuildersForTable: (table: string) => MockQueryBuilder[];
}

/**
 * Creates a fully isolated, mock Supabase client for Server Action tests.
 * Allows configuring per-table results and tracking all query arguments.
 */
export function createMockSupabaseClient(config: MockSupabaseClientConfig = {}): MockSupabaseClient {
  const tableBuilders = new Map<string, MockQueryBuilder[]>();

  const fromSpy = vi.fn((table: string) => {
    let result: MockQueryResult = {
      data: config.defaultData !== undefined ? config.defaultData : null,
      error: config.defaultError !== undefined ? config.defaultError : null,
    };

    if (config.tables && table in config.tables) {
      const tableConfig = config.tables[table];
      if (Array.isArray(tableConfig)) {
        const buildersSoFar = tableBuilders.get(table) || [];
        const nextIdx = buildersSoFar.length;
        const conf = tableConfig[nextIdx] ?? tableConfig[tableConfig.length - 1];
        result = conf;
      } else {
        result = tableConfig;
      }
    }

    const builder = createMockQueryBuilder(result);
    const existing = tableBuilders.get(table) || [];
    existing.push(builder);
    tableBuilders.set(table, existing);

    return builder;
  });

  const rpcSpy = vi.fn().mockImplementation(() => {
    return Promise.resolve({
      data: config.rpcData !== undefined ? config.rpcData : null,
      error: config.rpcError !== undefined ? config.rpcError : null,
    });
  });

  const getUserSpy = vi.fn().mockImplementation(() => {
    const user = config.user !== undefined ? config.user : MOCK_USER;
    const error = config.authError !== undefined ? config.authError : null;
    return Promise.resolve({
      data: { user },
      error,
    });
  });

  const signOutSpy = vi.fn().mockImplementation(() => {
    return Promise.resolve({
      error: config.signOutError !== undefined ? config.signOutError : null,
    });
  });

  return {
    from: fromSpy,
    rpc: rpcSpy,
    auth: {
      getUser: getUserSpy,
      signOut: signOutSpy,
    },
    getBuilderForTable: (table: string) => {
      const list = tableBuilders.get(table);
      return list && list.length > 0 ? list[list.length - 1] : undefined;
    },
    getAllBuildersForTable: (table: string) => {
      return tableBuilders.get(table) || [];
    },
  };
}
