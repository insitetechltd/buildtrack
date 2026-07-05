import {
  buildActiveStageModel,
  resolveActiveStageEntry,
} from "../taskDetailActiveStage";

describe("taskDetailActiveStage", () => {
  it("switches the active entry when the focus line crosses into the next row", () => {
    const result = resolveActiveStageEntry({
      entries: [
        { id: "entry-1", top: 0, height: 140 },
        { id: "entry-2", top: 164, height: 140 },
      ],
      focusY: 180,
      scrollY: 40,
    });

    expect(result?.id).toBe("entry-2");
  });

  it("keeps the previous entry active until the next row crosses the focus line", () => {
    const result = resolveActiveStageEntry({
      entries: [
        { id: "entry-1", top: 0, height: 140 },
        { id: "entry-2", top: 164, height: 140 },
      ],
      focusY: 120,
      scrollY: 10,
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
