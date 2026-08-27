import { translations } from "@/locales";
import {
  formatLocalizedActivityHeadline,
  formatPhotosCapturedLabel,
  localizeStoredActivityDescription,
} from "../localizeActivityText";

describe("localizeActivityText", () => {
  const zh = translations["zh-TW"];
  const en = translations.en;

  it("localizes status headlines in zh-TW", () => {
    expect(formatLocalizedActivityHeadline("new", zh)).toBe("新工作");
    expect(formatLocalizedActivityHeadline("accepted", zh)).toBe("工作已接受");
    expect(formatLocalizedActivityHeadline("in_progress", zh)).toBe("工作進行中");
  });

  it("keeps English headlines when language is en", () => {
    expect(formatLocalizedActivityHeadline("new", en)).toBe("New Task");
    expect(formatPhotosCapturedLabel(2, en)).toBe("2 photos captured");
  });

  it("formats photo batch counts in zh-TW", () => {
    expect(formatPhotosCapturedLabel(5, zh)).toBe("已拍攝 5 張相片");
  });

  it("remaps stored English event templates for display", () => {
    expect(localizeStoredActivityDescription("Task accepted by Tristan", zh)).toBe(
      "Tristan 接受了工作",
    );
    expect(
      localizeStoredActivityDescription(
        "Task completion rejected by Alex. Reason: redo weld",
        zh,
      ),
    ).toBe("Alex 拒絕了工作完成，原因：redo weld");
    expect(localizeStoredActivityDescription("2 photos captured", zh)).toBe(
      "已拍攝 2 張相片",
    );
  });

  it("leaves freeform progress prose unchanged", () => {
    expect(
      localizeStoredActivityDescription("Pour completed for section A", zh),
    ).toBe("Pour completed for section A");
  });
});
