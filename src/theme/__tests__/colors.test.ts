import { darkPalette, lightPalette, paletteFor } from "../colors";

describe("theme palettes", () => {
  it("keeps brand teal across light and dark", () => {
    expect(lightPalette.brand).toBe("#08576E");
    expect(darkPalette.brand).toBe("#08576E");
    expect(paletteFor("dark").canvas).toBe("#0B1C22");
    expect(paletteFor("light").surface).toBe("#FFFFFF");
  });
});
