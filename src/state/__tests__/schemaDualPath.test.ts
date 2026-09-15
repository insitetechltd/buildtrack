import {
  coalesceAssignees,
  isMissingRelationError,
  toDbSystemPermission,
  updateTaskStrippingEvolvedColumns,
  insertTaskActivityDualPath,
  insertTaskFile,
  toggleTaskStarDualPath,
  selectUserAclSequential,
  hydrateAssigneesFromJunction,
  hydrateAttachmentsFromTaskFiles,
  hydrateStarsFromTaskStars,
} from "../schemaDualPath";

describe("schemaDualPath.toDbSystemPermission", () => {
  it("maps live CHECK vocab to greenfield system_permission", () => {
    expect(toDbSystemPermission("company_admin")).toBe("admin");
    expect(toDbSystemPermission("admin")).toBe("admin");
    expect(toDbSystemPermission("supervisor")).toBe("manager");
    expect(toDbSystemPermission("manager")).toBe("manager");
    expect(toDbSystemPermission("worker")).toBe("member");
    expect(toDbSystemPermission("foreman")).toBe("member");
    expect(toDbSystemPermission("member")).toBe("member");
  });

  it("returns null for empty input", () => {
    expect(toDbSystemPermission(null)).toBeNull();
    expect(toDbSystemPermission(undefined)).toBeNull();
    expect(toDbSystemPermission("")).toBeNull();
  });
});

describe("schemaDualPath.coalesceAssignees", () => {
  it("prefers assigned_to column when present", () => {
    expect(coalesceAssignees(["a"], ["b", "c"])).toEqual(["a"]);
  });

  it("falls back to junction when column empty", () => {
    expect(coalesceAssignees([], ["b", "c"])).toEqual(["b", "c"]);
  });
});

describe("schemaDualPath.isMissingRelationError", () => {
  it("detects 42P01 and schema-cache messages", () => {
    expect(isMissingRelationError({ code: "42P01", message: "missing" })).toBe(true);
    expect(
      isMissingRelationError({
        code: "PGRST205",
        message: "Could not find the table 'public.task_files' in the schema cache",
      }),
    ).toBe(true);
    expect(isMissingRelationError({ code: "23505", message: "duplicate" })).toBe(false);
  });
});


describe("schemaDualPath.insertTaskActivityDualPath", () => {
  it("retries without top-level status when PROD schema rejects it", async () => {
    const inserts: Record<string, unknown>[] = [];
    const client = {
      from() {
        return {
          insert(rows: Record<string, unknown>) {
            inserts.push(rows);
            const result =
              inserts.length === 1
                ? {
                    data: null,
                    error: {
                      code: "PGRST204",
                      message:
                        "Could not find the 'status' column of 'task_activities' in the schema cache",
                    },
                  }
                : { data: { id: "act-1" }, error: null };
            return {
              select: () => ({
                single: async () => result,
              }),
              then: (resolve: any, reject: any) =>
                Promise.resolve(result).then(resolve, reject),
            };
          },
        };
      },
    } as any;

    const out = await insertTaskActivityDualPath(
      client,
      {
        task_id: "t1",
        user_id: "u1",
        activity_type: "progress_update",
        data: { description: "note" },
        description: "note",
        completion_percentage: 10,
        status: "in_progress",
      },
      { select: true },
    );

    expect(out.error).toBeNull();
    expect(out.strippedStatus).toBe(true);
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toHaveProperty("status", "in_progress");
    expect(inserts[1]).not.toHaveProperty("status");
    expect((inserts[1].data as any).status).toBe("in_progress");
  });
});

function fakeClient(handlers: Record<string, any>) {
  return {
    from(table: string) {
      const h = handlers[table] || {};
      const chain: any = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        delete: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => chain),
        single: jest.fn(async () => h.single?.() ?? { data: null, error: null }),
        then: undefined,
      };
      // Make awaitable terminal: update/insert/delete resolve via h.result
      const settle = async () => h.result?.(chain) ?? { data: null, error: null };
      chain.select.mockImplementation(() => {
        const sel: any = {
          eq: jest.fn(() => sel),
          in: jest.fn(() => sel),
          single: jest.fn(async () => h.single?.() ?? { data: null, error: null }),
        };
        // awaiting select().eq().in() style
        sel.eq.mockImplementation(() => {
          const eqChain: any = {
            eq: jest.fn(() => eqChain),
            in: jest.fn(async () => h.select?.() ?? { data: [], error: null }),
            single: jest.fn(async () => h.single?.() ?? { data: null, error: null }),
          };
          // for select().eq().eq().single()
          eqChain.eq.mockImplementation(() => eqChain);
          // allow await select().eq("user_id").eq("is_active")
          Object.assign(eqChain, {
            then: (resolve: any, reject: any) =>
              Promise.resolve(h.select?.() ?? { data: [], error: null }).then(resolve, reject),
          });
          return eqChain;
        });
        sel.in.mockImplementation(async () => h.select?.() ?? { data: [], error: null });
        Object.assign(sel, {
          then: (resolve: any, reject: any) =>
            Promise.resolve(h.select?.() ?? { data: [], error: null }).then(resolve, reject),
        });
        return sel;
      });
      chain.update.mockImplementation(() => {
        const u: any = {
          eq: jest.fn(async () => h.update?.() ?? { data: null, error: null }),
        };
        return u;
      });
      chain.insert.mockImplementation((rows: any) => {
        const i: any = {
          select: jest.fn(() => i),
          single: jest.fn(async () => h.insert?.(rows) ?? { data: null, error: null }),
          then: (resolve: any, reject: any) =>
            Promise.resolve(h.insert?.(rows) ?? { data: null, error: null }).then(
              resolve,
              reject,
            ),
        };
        return i;
      });
      chain.delete.mockImplementation(() => {
        const d: any = {
          eq: jest.fn(() => d),
        };
        d.eq.mockImplementation(() => ({
          eq: jest.fn(async () => h.delete?.() ?? { data: null, error: null }),
          then: (resolve: any, reject: any) =>
            Promise.resolve(h.delete?.() ?? { data: null, error: null }).then(resolve, reject),
        }));
        return d;
      });
      return chain;
    },
  } as any;
}

describe("schemaDualPath.updateTaskStrippingEvolvedColumns", () => {
  it("strips current_status on PGRST204 and retries without it", async () => {
    let calls = 0;
    const client = {
      from: () => ({
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            calls += 1;
            if (calls === 1 && "current_status" in payload) {
              return {
                data: null,
                error: {
                  code: "PGRST204",
                  message: "Could not find the 'current_status' column of 'tasks' in the schema cache",
                },
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
    } as any;

    const result = await updateTaskStrippingEvolvedColumns(client, "t1", {
      status: "in_progress",
      current_status: "in_progress",
      completion_percentage: 10,
    });

    expect(result.error).toBeNull();
    expect(result.finalPayload.current_status).toBeUndefined();
    expect(result.finalPayload.status).toBe("in_progress");
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("marks strippedAssignedTo when assigned_to is removed", async () => {
    let calls = 0;
    const client = {
      from: () => ({
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            calls += 1;
            if (calls === 1 && "assigned_to" in payload) {
              return {
                data: null,
                error: {
                  code: "42703",
                  message: "column tasks.assigned_to does not exist",
                },
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
    } as any;

    const result = await updateTaskStrippingEvolvedColumns(client, "t1", {
      assigned_to: ["u1"],
      status: "new",
    });
    expect(result.error).toBeNull();
    expect(result.strippedAssignedTo).toBe(true);
  });
});

describe("schemaDualPath.insertTaskFile", () => {
  it("returns usedTable=false on missing relation", async () => {
    const client = {
      from: () => ({
        insert: () => ({
          then: (resolve: any) =>
            resolve({
              data: null,
              error: {
                code: "42P01",
                message: 'relation "public.task_files" does not exist',
              },
            }),
        }),
      }),
    } as any;

    const result = await insertTaskFile(client, {
      task_id: "t1",
      storage_path: "co/tasks/t1/a.jpg",
      created_by: "u1",
    });
    expect(result.usedTable).toBe(false);
    expect(result.error).toBeNull();
  });

  it("returns usedTable=true on success", async () => {
    const client = {
      from: () => ({
        insert: () => ({
          then: (resolve: any) => resolve({ data: [{ id: "f1" }], error: null }),
        }),
      }),
    } as any;

    const result = await insertTaskFile(client, {
      task_id: "t1",
      storage_path: "co/tasks/t1/a.jpg",
      created_by: "u1",
    });
    expect(result.usedTable).toBe(true);
    expect(result.error).toBeNull();
  });
});

describe("schemaDualPath.toggleTaskStarDualPath", () => {
  it("inserts into task_stars when starring", async () => {
    const inserts: any[] = [];
    const client = {
      from: (table: string) => {
        if (table !== "task_stars") throw new Error(table);
        return {
          insert: (row: any) => {
            inserts.push(row);
            return {
              then: (resolve: any) => resolve({ data: null, error: null }),
            };
          },
        };
      },
    } as any;

    const result = await toggleTaskStarDualPath(client, {
      taskId: "t1",
      userId: "u1",
      currentlyStarred: false,
    });
    expect(result.error).toBeNull();
    expect(result.mode).toBe("junction");
    expect(inserts[0]).toMatchObject({ task_id: "t1", user_id: "u1" });
  });

  it("falls back to array mode when task_stars missing", async () => {
    const client = {
      from: () => ({
        insert: () => ({
          then: (resolve: any) =>
            resolve({
              data: null,
              error: {
                code: "PGRST205",
                message: "Could not find the table 'public.task_stars' in the schema cache",
              },
            }),
        }),
      }),
    } as any;

    const result = await toggleTaskStarDualPath(client, {
      taskId: "t1",
      userId: "u1",
      currentlyStarred: false,
    });
    expect(result.error).toBeNull();
    expect(result.mode).toBe("array");
  });
});

describe("schemaDualPath.selectUserAclSequential", () => {
  it("retries with system_permission when both-col select fails", async () => {
    let attempt = 0;
    const client = {
      from: () => ({
        select: (cols: string) => ({
          eq: () => ({
            single: async () => {
              attempt += 1;
              if (cols.includes("role") && cols.includes("system_permission")) {
                return {
                  data: null,
                  error: {
                    code: "42703",
                    message: "column users.role does not exist",
                  },
                };
              }
              if (cols.includes("system_permission")) {
                return {
                  data: { name: "Sara", system_permission: "admin" },
                  error: null,
                };
              }
              return { data: null, error: { message: "unexpected" } };
            },
          }),
        }),
      }),
    } as any;

    const row = await selectUserAclSequential(client, "u1");
    expect(row).toEqual({
      name: "Sara",
      role: undefined,
      systemPermission: "admin",
    });
    expect(attempt).toBeGreaterThanOrEqual(2);
  });
});

describe("schemaDualPath hydrate helpers", () => {
  it("hydrateAssigneesFromJunction groups by task", async () => {
    const client = {
      from: () => ({
        select: () => ({
          in: () => ({
            eq: async () => ({
              data: [
                { task_id: "t1", user_id: "u1" },
                { task_id: "t1", user_id: "u2" },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as any;
    // Fix chain: select().in().eq() — our hydrate uses .in().eq()
    const client2 = {
      from: () => ({
        select: () => ({
          in: () => ({
            eq: async () => ({
              data: [
                { task_id: "t1", user_id: "u1" },
                { task_id: "t1", user_id: "u2" },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as any;

    const map = await hydrateAssigneesFromJunction(client2, ["t1"]);
    expect(map.get("t1")).toEqual(["u1", "u2"]);
  });

  it("hydrateAttachmentsFromTaskFiles returns storage paths", async () => {
    const client = {
      from: () => ({
        select: () => ({
          in: async () => ({
            data: [
              { task_id: "t1", storage_path: "a/b.jpg" },
              { task_id: "t1", storage_path: "a/c.jpg" },
            ],
            error: null,
          }),
        }),
      }),
    } as any;
    const map = await hydrateAttachmentsFromTaskFiles(client, ["t1"]);
    expect(map.get("t1")).toEqual(["a/b.jpg", "a/c.jpg"]);
  });

  it("hydrateStarsFromTaskStars returns user ids", async () => {
    const client = {
      from: () => ({
        select: () => ({
          in: async () => ({
            data: [
              { task_id: "t1", user_id: "u1" },
              { task_id: "t1", user_id: "u2" },
            ],
            error: null,
          }),
        }),
      }),
    } as any;
    const map = await hydrateStarsFromTaskStars(client, ["t1"]);
    expect(map.get("t1")).toEqual(["u1", "u2"]);
  });
});
