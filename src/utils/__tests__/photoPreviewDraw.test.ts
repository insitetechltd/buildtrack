import {
  appendStroke,
  DRAW_SCREEN_STROKE_WIDTH,
  mapScreenPointToSource,
  mapSourcePointToScreen,
  screenStrokeWidthToSource,
  undoLastStroke,
  type DrawStroke,
} from "../photoPreviewDraw";
import type { Rect } from "../photoPreviewEdit";

const layout: Rect = { x: 50, y: 100, width: 200, height: 100 };

describe("photoPreviewDraw", () => {
  it("maps screen points inside the contain layout to source pixels", () => {
    const point = mapScreenPointToSource(150, 150, layout, 400, 200);
    expect(point).toEqual({ x: 200, y: 100 });
  });

  it("rejects points outside the image layout", () => {
    expect(mapScreenPointToSource(10, 10, layout, 400, 200)).toBeNull();
  });

  it("scales screen stroke width into source pixels", () => {
    expect(screenStrokeWidthToSource(DRAW_SCREEN_STROKE_WIDTH, layout, 400)).toBe(8);
  });

  it("round-trips source points back to screen", () => {
    const source = { x: 200, y: 100 };
    expect(mapSourcePointToScreen(source, layout, 400, 200)).toEqual({
      x: 150,
      y: 150,
    });
  });

  it("appends valid strokes including single-tap dots", () => {
    const emptyStroke: DrawStroke = {
      color: "#ef4444",
      width: 8,
      points: [],
    };
    expect(appendStroke([], emptyStroke)).toEqual([]);

    const singlePointDot: DrawStroke = {
      color: "#ef4444",
      width: 8,
      points: [{ x: 1, y: 1 }],
    };
    expect(appendStroke([], singlePointDot)).toEqual([singlePointDot]);

    const multiPointStroke: DrawStroke = {
      ...singlePointDot,
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    };
    expect(appendStroke([singlePointDot], multiPointStroke)).toEqual([
      singlePointDot,
      multiPointStroke,
    ]);
  });

  it("undoes the last stroke without mutating earlier ones", () => {
    const a: DrawStroke = {
      color: "#ef4444",
      width: 4,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    };
    const b: DrawStroke = {
      color: "#ffffff",
      width: 4,
      points: [
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ],
    };
    expect(undoLastStroke([a, b])).toEqual([a]);
    expect(undoLastStroke([])).toEqual([]);
  });
});
