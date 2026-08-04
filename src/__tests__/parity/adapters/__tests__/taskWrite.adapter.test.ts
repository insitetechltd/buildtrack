import { readAssignees, writeAssignees } from '../taskWrite.adapter';

function mockService(options?: {
  assignmentsError?: boolean;
  rows?: Array<{ user_id: string }>;
}) {
  const updates: unknown[] = [];
  const inserts: unknown[] = [];

  return {
    updates,
    inserts,
    from(table: string) {
      if (table === 'task_assignments') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () =>
                options?.assignmentsError
                  ? { data: null, error: { message: 'missing' } }
                  : { data: options?.rows || [], error: null },
            }),
          }),
          update: (payload: unknown) => {
            updates.push(payload);
            return {
              eq: async () => ({ error: null }),
            };
          },
          insert: async (payload: unknown) => {
            inserts.push(payload);
            if (options?.assignmentsError) {
              return { error: { message: 'missing' } };
            }
            return { error: null };
          },
        };
      }

      if (table === 'tasks') {
        return {
          update: (payload: unknown) => {
            updates.push(payload);
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe('taskWrite adapter', () => {
  it('reads assigned_to array on OLD target', async () => {
    const service = mockService();
    const ids = await readAssignees(
      service as any,
      't1',
      { assigned_to: ['a', 'b'] },
      'old',
    );
    expect(ids).toEqual(['a', 'b']);
  });

  it('reads task_assignments on NEW target', async () => {
    const service = mockService({
      rows: [{ user_id: 'u1' }, { user_id: 'u2' }],
    });
    const ids = await readAssignees(service as any, 't1', {}, 'new');
    expect(ids).toEqual(['u1', 'u2']);
  });

  it('writes assigned_to on OLD target', async () => {
    const service = mockService();
    await writeAssignees(service as any, {
      taskId: 't1',
      assigneeIds: ['u1'],
      createdBy: 'actor',
      target: 'old',
    });
    expect(service.updates[0]).toEqual({ assigned_to: ['u1'] });
  });

  it('writes task_assignments on NEW target', async () => {
    const service = mockService();
    await writeAssignees(service as any, {
      taskId: 't1',
      assigneeIds: ['u1', 'u2'],
      primaryAssigneeId: 'u1',
      createdBy: 'actor',
      target: 'new',
    });
    expect(service.inserts[0]).toEqual([
      {
        task_id: 't1',
        user_id: 'u1',
        assignment_kind: 'primary',
        is_active: true,
        created_by: 'actor',
      },
      {
        task_id: 't1',
        user_id: 'u2',
        assignment_kind: 'delegated',
        is_active: true,
        created_by: 'actor',
      },
    ]);
  });
});
