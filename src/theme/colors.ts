/**
 * Taskr brand color schemes — light (jobsite day) + dark (jobsite night).
 * Prefer these tokens over ad-hoc hex when adding dark: variants.
 *
 * Header chrome stays deep teal in both modes for brand continuity.
 */

export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  /** Page background behind cards */
  canvas: string;
  /** Elevated card / sheet surface */
  surface: string;
  /** Subtle border on surfaces */
  border: string;
  /** Primary body text */
  ink: string;
  /** Secondary / muted text */
  inkMuted: string;
  /** Tertiary / placeholder */
  inkFaint: string;
  /** Brand header / primary chrome */
  brand: string;
  /** Brand header border / accent strip */
  brandBorder: string;
  /** Header title text (on brand) */
  brandInk: string;
  /** Primary interactive (links, selected) */
  accent: string;
  /** Avatar / strong accent fill */
  accentStrong: string;
  /** Danger text */
  danger: string;
};

export const lightPalette: ThemePalette = {
  canvas: "#E7F4F8",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  ink: "#111827",
  inkMuted: "#4B5563",
  inkFaint: "#6B7280",
  brand: "#08576E",
  brandBorder: "#0B6A84",
  brandInk: "#F8FCFF",
  accent: "#0A556B",
  accentStrong: "#12A8E0",
  danger: "#DC2626",
};

/** Night jobsite: cool slate canvas, teal brand retained, soft ink. */
export const darkPalette: ThemePalette = {
  canvas: "#0B1C22",
  surface: "#132830",
  border: "#1E3A44",
  ink: "#E8F4F8",
  inkMuted: "#A8C5D0",
  inkFaint: "#7A9AA6",
  brand: "#08576E",
  brandBorder: "#0B6A84",
  brandInk: "#F8FCFF",
  accent: "#4DB8D9",
  accentStrong: "#12A8E0",
  danger: "#F87171",
};

export function paletteFor(mode: ThemeMode): ThemePalette {
  return mode === "dark" ? darkPalette : lightPalette;
}
