import {
  CREATE_TASK_CONTROL_FONT_SIZE,
  CREATE_TASK_CONTROL_INPUT,
  CREATE_TASK_CONTROL_SHELL,
} from "../createTaskFormChrome";
import { INPUT_DENSITY_CLASS_MAP, INPUT_DENSITY_FONT_SIZE } from "@/components/primitives/tokens/input";

describe("createTaskFormChrome", () => {
  it("matches TextField expanded density for shell height, radius, padding, and type", () => {
    const expanded = INPUT_DENSITY_CLASS_MAP.expanded;

    expect(CREATE_TASK_CONTROL_SHELL).toContain("min-h-14");
    expect(CREATE_TASK_CONTROL_SHELL).toContain("rounded-xl");
    expect(CREATE_TASK_CONTROL_SHELL).toContain("px-4");
    expect(CREATE_TASK_CONTROL_SHELL).toContain("py-3");
    expect(expanded.inputContainer).toContain("min-h-14");
    expect(expanded.inputContainer).toContain("rounded-xl");
    expect(expanded.inputContainer).toContain("px-4");
    expect(expanded.inputContainer).toContain("py-3");

    expect(CREATE_TASK_CONTROL_INPUT).toContain("text-lg");
    expect(CREATE_TASK_CONTROL_FONT_SIZE).toBe(INPUT_DENSITY_FONT_SIZE.expanded);
  });
});
