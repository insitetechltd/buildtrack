const NEW_SCHEMA_SIDE_TABLES = new Set([
  'task_assignments',
  'task_files',
  'task_stars',
]);

export function mockSupabaseNewSchemaTable(table: string): Record<string, jest.Mock> | null {
  if (!NEW_SCHEMA_SIDE_TABLES.has(table)) return null;

  const emptyResult = { data: [] as any[], error: null };
  const chain: Record<string, jest.Mock> & {
    then?: (
      onFulfilled: (value: typeof emptyResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  } = {} as any;

  chain.select = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.contains = jest.fn(() => chain);
  chain.gte = jest.fn(() => chain);
  chain.insert = jest.fn((rows: unknown) =>
    Promise.resolve({ data: rows ?? null, error: null }),
  );
  chain.upsert = jest.fn((rows: unknown) =>
    Promise.resolve({ data: rows ?? null, error: null }),
  );
  chain.single = jest.fn(() => Promise.resolve(emptyResult));
  chain.maybeSingle = jest.fn(() => Promise.resolve(emptyResult));
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(emptyResult).then(onFulfilled, onRejected);

  return chain;
}

export function installNewSchemaTableFallback(mockFrom: jest.Mock): void {
  const installImplementation = mockFrom.mockImplementation.bind(mockFrom);

  mockFrom.mockImplementation = ((
    implementation: (table: string, ...args: unknown[]) => unknown,
  ) =>
    installImplementation((table: string, ...args: unknown[]) => {
      const sideTable = mockSupabaseNewSchemaTable(table);
      return sideTable ?? implementation(table, ...args);
    })) as typeof mockFrom.mockImplementation;
}
