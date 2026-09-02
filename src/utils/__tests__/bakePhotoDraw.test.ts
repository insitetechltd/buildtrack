jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(async () => ({ uri: "file://normalized.jpg" })),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: jest.fn(async () => "ENCODED_JPEG_BASE64"),
  EncodingType: { Base64: "base64" },
}));

jest.mock("../draftMediaCache", () => ({
  writeClipboardImageToDraft: jest.fn(async () => "file://draft_draw.jpg"),
}));

const mockFromBase64 = jest.fn(() => "skia-data");
const mockMakeImageFromEncoded = jest.fn(() => ({
  width: () => 100,
  height: () => 80,
}));
const mockDrawImage = jest.fn();
const mockDrawPath = jest.fn();
const mockDrawCircle = jest.fn();
const mockFlush = jest.fn();
const mockEncodeToBase64 = jest.fn(() => "BAKED_JPEG");
const mockMakeImageSnapshot = jest.fn(() => ({
  encodeToBase64: mockEncodeToBase64,
}));
const mockGetCanvas = jest.fn(() => ({
  drawImage: mockDrawImage,
  drawPath: mockDrawPath,
  drawCircle: mockDrawCircle,
}));
const mockMakeOffscreen = jest.fn(() => ({
  getCanvas: mockGetCanvas,
  flush: mockFlush,
  makeImageSnapshot: mockMakeImageSnapshot,
}));

jest.mock("@shopify/react-native-skia", () => ({
  Skia: {
    Data: { fromBase64: mockFromBase64 },
    Image: { MakeImageFromEncoded: mockMakeImageFromEncoded },
    Surface: { MakeOffscreen: mockMakeOffscreen, Make: jest.fn() },
    Paint: () => ({
      setStyle: jest.fn(),
      setStrokeCap: jest.fn(),
      setStrokeJoin: jest.fn(),
      setAntiAlias: jest.fn(),
      setColor: jest.fn(),
      setStrokeWidth: jest.fn(),
    }),
    Path: {
      Make: () => ({
        moveTo: jest.fn(),
        lineTo: jest.fn(),
      }),
    },
    Color: jest.fn((c: string) => c),
  },
  ImageFormat: { JPEG: 3 },
  PaintStyle: { Stroke: 1 },
  StrokeCap: { Round: 1 },
  StrokeJoin: { Round: 1 },
}));

jest.mock("react-native", () => ({
  NativeModules: { RNSkiaModule: {} },
  TurboModuleRegistry: { get: () => ({}) },
}));

import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { writeClipboardImageToDraft } from "../draftMediaCache";
import { bakeStrokesOntoPhoto } from "../bakePhotoDraw";

describe("bakeStrokesOntoPhoto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeImageFromEncoded.mockReturnValue({
      width: () => 100,
      height: () => 80,
    });
    mockEncodeToBase64.mockReturnValue("BAKED_JPEG");
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file://normalized.jpg",
    });
  });

  it("normalizes to JPEG via manipulator before Skia decode (HEIC-safe)", async () => {
    const strokes = [
      {
        color: "#ef4444",
        width: 8,
        points: [
          { x: 1, y: 1 },
          { x: 20, y: 30 },
        ],
      },
    ];

    const out = await bakeStrokesOntoPhoto("file://photo.heic", strokes);

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file://photo.heic",
      [],
      expect.objectContaining({ format: "jpeg" }),
    );
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      "file://normalized.jpg",
      expect.objectContaining({ encoding: "base64" }),
    );
    expect(mockFromBase64).toHaveBeenCalledWith("ENCODED_JPEG_BASE64");
    expect(mockMakeImageFromEncoded).toHaveBeenCalled();
    expect(writeClipboardImageToDraft).toHaveBeenCalledWith(
      "BAKED_JPEG",
      expect.stringMatching(/^draw_\d+\.jpg$/),
    );
    expect(out).toBe("file://draft_draw.jpg");
  });

  it("bakes single-point dots using canvas.drawCircle", async () => {
    const dotStroke = [
      {
        color: "#f59e0b",
        width: 10,
        points: [{ x: 50, y: 50 }],
      },
    ];

    const out = await bakeStrokesOntoPhoto("file://photo.jpg", dotStroke);

    expect(mockDrawCircle).toHaveBeenCalledWith(50, 50, 5, expect.anything());
    expect(out).toBe("file://draft_draw.jpg");
  });

  it("throws when Skia cannot decode the normalized JPEG", async () => {
    mockMakeImageFromEncoded.mockReturnValue(null);

    await expect(
      bakeStrokesOntoPhoto("file://a.jpg", [
        {
          color: "#fff",
          width: 4,
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ]),
    ).rejects.toThrow("Failed to decode photo for draw bake");
  });
});
