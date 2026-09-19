import {
  IPAD_EVIDENCE_MEDIA_MAX_HEIGHT,
  IPAD_EVIDENCE_SINGLE_HEIGHT_LANDSCAPE,
  IPAD_EVIDENCE_SINGLE_HEIGHT_PORTRAIT,
  IPAD_EVIDENCE_TILE_GAP,
  IPAD_EVIDENCE_TILE_LANDSCAPE,
  IPAD_EVIDENCE_TILE_PORTRAIT,
  IPAD_EVIDENCE_TWO_UP_HEIGHT,
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

describe("resolveIpadEvidenceLayout", () => {
  const ipadPortrait = { windowWidth: 834, windowHeight: 1194, contentWidth: 746 };
  const ipadLandscape = { windowWidth: 1194, windowHeight: 834, contentWidth: 1106 };

  it("caps a single photo to 200pt portrait / 220pt landscape, never above the media max", () => {
    const portrait = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 1 });
    const landscape = resolveIpadEvidenceLayout({ ...ipadLandscape, photoCount: 1 });

    expect(portrait.mode).toBe("single");
    expect(portrait.mediaHeight).toBe(IPAD_EVIDENCE_SINGLE_HEIGHT_PORTRAIT);
    expect(portrait.tileWidth).toBe(746);
    expect(landscape.mode).toBe("single");
    expect(landscape.mediaHeight).toBe(IPAD_EVIDENCE_SINGLE_HEIGHT_LANDSCAPE);
    expect(landscape.mediaHeight).toBeLessThanOrEqual(IPAD_EVIDENCE_MEDIA_MAX_HEIGHT);
  });

  it("lays out two photos as equal 2-up tiles under the height cap", () => {
    const layout = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 2 });

    expect(layout.mode).toBe("two-up");
    expect(layout.tileWidth).toBe((746 - IPAD_EVIDENCE_TILE_GAP) / 2);
    expect(layout.tileHeight).toBe(IPAD_EVIDENCE_TWO_UP_HEIGHT);
    expect(layout.mediaHeight).toBe(IPAD_EVIDENCE_TWO_UP_HEIGHT);
    expect(layout.showOverflowBadge).toBe(false);
  });

  it("uses a 3-slot portrait filmstrip with +N when more photos remain", () => {
    const three = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 3 });
    const six = resolveIpadEvidenceLayout({ ...ipadPortrait, photoCount: 6 });

    expect(three.mode).toBe("filmstrip");
    expect(three.visibleSlots).toBe(3);
    expect(three.tileWidth).toBe(IPAD_EVIDENCE_TILE_PORTRAIT);
    expect(three.showOverflowBadge).toBe(false);
    expect(six.visibleSlots).toBe(3);
    expect(six.overflowCount).toBe(3);
    expect(six.showOverflowBadge).toBe(true);
    expect(six.mediaHeight).toBeLessThanOrEqual(IPAD_EVIDENCE_MEDIA_MAX_HEIGHT);
  });

  it("fits four landscape tiles without overflow on an 11-inch iPad", () => {
    const four = resolveIpadEvidenceLayout({ ...ipadLandscape, photoCount: 4 });
    const six = resolveIpadEvidenceLayout({ ...ipadLandscape, photoCount: 6 });

    expect(four.visibleSlots).toBe(4);
    expect(four.overflowCount).toBe(0);
    expect(four.tileWidth).toBe(IPAD_EVIDENCE_TILE_LANDSCAPE);
    expect(six.visibleSlots).toBe(4);
    expect(six.overflowCount).toBe(2);
    expect(six.showOverflowBadge).toBe(true);
  });
});
