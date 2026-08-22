const memoryStore: Record<string, string> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn((key: string, value: string) => {
    memoryStore[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string) => Promise.resolve(memoryStore[key] ?? null)),
  removeItem: jest.fn((key: string) => {
    delete memoryStore[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(memoryStore).forEach((key) => {
      delete memoryStore[key];
    });
    return Promise.resolve();
  }),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CreateTaskFormModel } from "@/ui/contracts/viewAdapters";
import {
  LOCAL_TASK_DRAFTS_STORAGE_KEY,
  LOCAL_TASK_DRAFT_TTL_MS,
  deleteLocalTaskDraft,
  deserializeCreateTaskForm,
  filterActiveDrafts,
  getLocalTaskDraft,
  isDraftTitleValid,
  listLocalTaskDrafts,
  purgeExpiredLocalTaskDrafts,
  saveLocalTaskDraft,
  serializeCreateTaskForm,
} from "../localTaskDraftStore";

function sampleForm(overrides: Partial<CreateTaskFormModel> = {}): CreateTaskFormModel {
  return {
    title: "Pour concrete",
    description: "Level 3 slab",
    taskReference: "",
    billingStatus: "non_billable",
    priority: "medium",
    category: "general",
    dueDate: new Date("2026-09-01T00:00:00.000Z"),
    locationOnSite: "",
    assignedTo: [],
    primaryAssigneeId: "",
    containerId: "",
    subContainerId: "",
    customTags: [],
    isCriticalThisWeek: false,
    attachments: [],
    projectId: "project-1",
    ...overrides,
  };
}

describe("localTaskDraftStore", () => {
  beforeEach(async () => {
    Object.keys(memoryStore).forEach((key) => {
      delete memoryStore[key];
    });
    await AsyncStorage.clear();
  });

  it("requires a non-empty title to save", async () => {
    await expect(
      saveLocalTaskDraft({ form: sampleForm({ title: "   " }) }),
    ).rejects.toThrow(/title/i);
    expect(isDraftTitleValid("")).toBe(false);
    expect(isDraftTitleValid("Valid")).toBe(true);
  });

  it("saves, lists, and loads a draft", async () => {
    const now = Date.parse("2026-08-22T12:00:00.000Z");
    const saved = await saveLocalTaskDraft({
      form: sampleForm(),
      nowMs: now,
    });

    expect(saved.titlePreview).toBe("Pour concrete");
    expect(saved.expiresAt).toBe(
      new Date(now + LOCAL_TASK_DRAFT_TTL_MS).toISOString(),
    );

    const listed = await listLocalTaskDrafts(now);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(saved.id);

    const loaded = await getLocalTaskDraft(saved.id, now);
    expect(deserializeCreateTaskForm(loaded!.form).title).toBe("Pour concrete");
  });

  it("updates an existing draft id", async () => {
    const now = Date.parse("2026-08-22T12:00:00.000Z");
    const first = await saveLocalTaskDraft({ form: sampleForm(), nowMs: now });
    const second = await saveLocalTaskDraft({
      id: first.id,
      form: sampleForm({ title: "Updated pour", description: "Revised" }),
      nowMs: now + 1000,
    });

    expect(second.id).toBe(first.id);
    expect(second.titlePreview).toBe("Updated pour");
    expect(await listLocalTaskDrafts(now + 1000)).toHaveLength(1);
  });

  it("purges drafts older than 7 days", async () => {
    const createdAt = Date.parse("2026-08-01T12:00:00.000Z");
    const now = createdAt + LOCAL_TASK_DRAFT_TTL_MS + 1;
    await saveLocalTaskDraft({ form: sampleForm(), nowMs: createdAt });

    expect(await purgeExpiredLocalTaskDrafts(now)).toBe(1);
    expect(await listLocalTaskDrafts(now)).toHaveLength(0);
  });

  it("deletes a draft by id", async () => {
    const saved = await saveLocalTaskDraft({ form: sampleForm() });
    await deleteLocalTaskDraft(saved.id);
    expect(await listLocalTaskDrafts()).toHaveLength(0);
  });

  it("round-trips form serialization", () => {
    const form = sampleForm();
    const roundTrip = deserializeCreateTaskForm(serializeCreateTaskForm(form));
    expect(roundTrip.title).toBe(form.title);
    expect(roundTrip.dueDate.toISOString()).toBe(form.dueDate.toISOString());
  });

  it("filterActiveDrafts excludes expired rows", () => {
    const now = Date.parse("2026-08-22T12:00:00.000Z");
    const active = filterActiveDrafts(
      [
        {
          id: "a",
          savedAt: new Date(now).toISOString(),
          expiresAt: new Date(now + 1000).toISOString(),
          titlePreview: "Active",
          form: serializeCreateTaskForm(sampleForm()),
        },
        {
          id: "b",
          savedAt: new Date(now - 2000).toISOString(),
          expiresAt: new Date(now - 1).toISOString(),
          titlePreview: "Expired",
          form: serializeCreateTaskForm(sampleForm({ title: "Expired" })),
        },
      ],
      now,
    );
    expect(active.map((draft) => draft.id)).toEqual(["a"]);
  });

  it("uses the canonical storage key", async () => {
    await saveLocalTaskDraft({ form: sampleForm() });
    expect(await AsyncStorage.getItem(LOCAL_TASK_DRAFTS_STORAGE_KEY)).toContain(
      "Pour concrete",
    );
  });
});
