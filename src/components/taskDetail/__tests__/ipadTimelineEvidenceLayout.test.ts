import {
  IPAD_EVIDENCE_PEEK_WIDTH,
  IPAD_EVIDENCE_SLOTS_LANDSCAPE,
  IPAD_EVIDENCE_SLOTS_PORTRAIT,
  IPAD_EVIDENCE_TILE_GAP,
  IPAD_EVIDENCE_WIDTH_CHROME_FALLBACK,
  estimateIpadEvidenceContentWidth,
  isIpadLandscapeMetaSplit,
  isIpadTimelineHost,
  resolveIpadEvidenceLayout,
} from "../ipadTimelineEvidenceLayout";

describe("isIpadTimelineHost", () => {
  it("is true only for iOS iPad", () => {
    expect(isIpadTimelineHost({ OS: "ios", isPad: true })).toBe(true);
    expect(isIpadTimelineHost({ OS: "ios", isPad: false })).toBe(false);
    expect(isIpadTimelineHost({ OS: "android", isPad: true })).toBe(false);
  });
});

describe("isIpadLandscapeMetaSplit", () => {
  it("splits only on iPad landscape", () => {
    expect(isIpadLandscapeMetaSplit({ OS: "ios", isPad: true }, 1194, 834)).toBe(true);
    expect(isIpadLandscapeMetaSplit({ OS: "ios", isPad: true }, 834, 1194)).toBe(false);
    expect(isIpadLandscapeMetaSplit({ OS: "ios", isPad: false }, 1194, 834)).toBe(false);
  });
});

describe("estimateIpadEvidenceContentWidth", () => {
  it("uses full window minus chrome in portrait and 2/3 in landscape", () => {
    const portrait = estimateIpadEvidenceContentWidth({
      platform: { OS: "ios", isPad: true },
      windowWidth: 834,
      windowHeight: 1194,
    });
    const landscape = estimateIpadEvidenceContentWidth({
      platform: { OS: "ios", isPad: true },
      windowWidth: 1194,
      windowHeight: 834,
    });

    expect(portrait).toBe(834 - IPAD_EVIDENCE_WIDTH_CHROME_FALLBACK);
    expect(landscape).toBe(1194 * (2 / 3) - IPAD_EVIDENCE_WIDTH_CHROME_FALLBACK);
  });
});

describe("resolveIpadEvidenceLayout", () => {
  const ipadPortrait = { windowWidth: 834, windowHeight: 1194, contentWidth: 746 };
  const ipadLandscape = { windowWidth: 1194, windowHeight: 834, contentWidth: 700 };

  it("keeps a 1-photo tile the same size as each 3-up tile (11-inch portrait 746pt)", () => {
    const one = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 1 });
    const two = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 2 });
    const three = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 3 });
    const six = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 6 });

    expect(one.slotCount).toBe(IPAD_EVIDENCE_SLOTS_PORTRAIT);
    expect(one.tileWidth).toBe(231);
    expect(one.tileHeight).toBe(173);
    expect(one.tileWidth).toBeLessThan(746);
    expect(two.tileWidth).toBe(one.tileWidth);
    expect(two.tileHeight).toBe(one.tileHeight);
    expect(three.tileWidth).toBe(one.tileWidth);
    expect(three.canSlide).toBe(false);
    expect(six.tileWidth).toBe(one.tileWidth);
    expect(six.tileHeight).toBe(one.tileHeight);
    expect(six.canSlide).toBe(true);
    expect(six.peekWidth).toBe(IPAD_EVIDENCE_PEEK_WIDTH);
  });

  it("does not stretch two photos to fill the row", () => {
    const layout = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 2 });
    const pairWidth = layout.tileWidth * 2 + IPAD_EVIDENCE_TILE_GAP;

    expect(pairWidth).toBeLessThan(746);
    expect(layout.canSlide).toBe(false);
  });

  it("uses four equal landscape tiles and slides when a fifth remains", () => {
    const one = resolveIpadEvidenceLayout({ ...ipadLandscape, photoCount: 1 });
    const four = resolveIpadEvidenceLayout({ ...ipadLandscape, photoCount: 4 });
    const six = resolveIpadEvidenceLayout({ ...ipadLandscape, photoCount: 6 });

    expect(four.slotCount).toBe(IPAD_EVIDENCE_SLOTS_LANDSCAPE);
    expect(four.tileWidth).toBe(160);
    expect(four.tileHeight).toBe(120);
    expect(one.tileWidth).toBe(four.tileWidth);
    expect(four.canSlide).toBe(false);
    expect(six.canSlide).toBe(true);
    expect(six.tileWidth).toBe(four.tileWidth);
  });
});
