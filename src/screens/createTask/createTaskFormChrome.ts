/**
 * Shared single-line control chrome for Create Task.
 * Fixed 56px row height — same for text inputs and select triggers.
 * (Avoid TextField expanded’s py-3 + inner minHeight stacking, which reads ~64px.)
 */
export const CREATE_TASK_CONTROL_HEIGHT = 56;

export const CREATE_TASK_CONTROL_SHELL =
  "h-14 flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-4";

export const CREATE_TASK_CONTROL_SHELL_ERROR =
  "h-14 flex-row items-center justify-between rounded-xl border border-red-300 bg-white px-4";

export const CREATE_TASK_CONTROL_SHELL_FOCUS =
  "h-14 flex-row items-center justify-between rounded-xl border border-blue-600 bg-white px-4";

export const CREATE_TASK_CONTROL_TEXT = "flex-1 text-base leading-6 text-slate-900";

export const CREATE_TASK_CONTROL_PLACEHOLDER =
  "flex-1 text-base leading-6 text-slate-500";

export const CREATE_TASK_CONTROL_INPUT =
  "h-14 rounded-xl border border-slate-300 bg-white px-4 text-base leading-6 text-slate-900";

/** Native fontSize — iOS TextInput often ignores NativeWind text-* classes. */
export const CREATE_TASK_CONTROL_FONT_SIZE = 16;

/** Labels stay slightly larger than control text (jobsite scan hierarchy). */
export const CREATE_TASK_LABEL_CLASS =
  "text-base leading-6 font-semibold text-slate-900";

export const CREATE_TASK_REQUIRED_MARKER_CLASS =
  "text-base leading-6 font-semibold text-red-600";
