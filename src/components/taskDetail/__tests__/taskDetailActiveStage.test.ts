import {
  buildActiveStageModel,
  resolveActiveStageEntry,
} from "../taskDetailActiveStage";

describe("taskDetailActiveStage", () => {
  it("treats the top-most newest-first entry as the active stage owner", () => {
    const result = resolveActiveStageEntry({
      entries: [
        { id: "entry-1", top: 12 },
        { id: "entry-2", top: 164 },
      ],
      topEdge: 0,
    });

    expect(result?.id).toBe("entry-1");
  });

  it("returns a neutral no-photo mode for text-only entries", () => {
    expect(
      buildActiveStageModel({
        id: "entry-2",
        mode: "text",
        title: "Added status note",
        summary: "Waiting on supplier confirmation.",
      }),
    ).toMatchObject({
      stageMode: "no_photo",
    });
  });

  it("returns a pdf preview mode for pdf entries", () => {
    expect(
      buildActiveStageModel({
        id: "entry-3",
        mode: "pdf",
        title: "Attached site report",
        summary: "Weekly report uploaded.",
      }),
    ).toMatchObject({
      stageMode: "pdf_preview",
    });
  });

  it("returns a photo mode for photo entries", () => {
    expect(
      buildActiveStageModel({
        id: "entry-4",
        mode: "photo",
        title: "Added progress photos",
        summary: "Ceiling grid installed.",
      }),
    ).toMatchObject({
      stageMode: "photo",
    });
  });
});
