import {
  CREATE_TASK_CONTROL_FONT_SIZE,
  CREATE_TASK_CONTROL_HEIGHT,
  CREATE_TASK_CONTROL_INPUT,
  CREATE_TASK_CONTROL_SHELL,
  CREATE_TASK_LABEL_CLASS,
} from "../createTaskFormChrome";

describe("createTaskFormChrome", () => {
  it("locks single-line controls to a shared 56px row with 16px type", () => {
    expect(CREATE_TASK_CONTROL_HEIGHT).toBe(56);
    expect(CREATE_TASK_CONTROL_FONT_SIZE).toBe(16);
    expect(CREATE_TASK_CONTROL_SHELL).toContain("h-14");
    expect(CREATE_TASK_CONTROL_SHELL).toContain("px-4");
    expect(CREATE_TASK_CONTROL_SHELL).not.toContain("py-3");
    expect(CREATE_TASK_CONTROL_INPUT).toContain("h-14");
    expect(CREATE_TASK_LABEL_CLASS).toContain("text-base");
  });
});
