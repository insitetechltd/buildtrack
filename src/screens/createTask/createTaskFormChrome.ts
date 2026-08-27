/**
 * Shared control chrome for Create Task — matches TextField `expanded` density
 * (min-h-14, rounded-xl, px-4 py-3, text-lg / 18px).
 */
export const CREATE_TASK_CONTROL_SHELL =
  "min-h-14 flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3";

export const CREATE_TASK_CONTROL_SHELL_ERROR =
  "min-h-14 flex-row items-center justify-between rounded-xl border border-red-300 bg-white px-4 py-3";

export const CREATE_TASK_CONTROL_SHELL_FOCUS =
  "min-h-14 flex-row items-center justify-between rounded-xl border border-blue-600 bg-white px-4 py-3";

export const CREATE_TASK_CONTROL_TEXT = "flex-1 text-lg leading-7 text-slate-900";

export const CREATE_TASK_CONTROL_PLACEHOLDER =
  "flex-1 text-lg leading-7 text-slate-500";

export const CREATE_TASK_CONTROL_INPUT =
  "min-h-14 rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg leading-7 text-slate-900";

/** Native fontSize — iOS TextInput often ignores NativeWind text-* classes. */
export const CREATE_TASK_CONTROL_FONT_SIZE = 18;
