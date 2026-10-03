import {
  defaultCropRectInImageLayout,
  getContainedImageLayout,
  getEditCanvasImageLayout,
  dialMarkOffset,
  dialPeekCenterY,
  mapCoverCropAfterRotation,
  mapCropRectToSourcePixels,
  resolveImageDimensions,
  clampImagePan,
  cropRectForImageOffset,
  cropRotationCoverScale,
  rotationCoverScale,
} from "../photoPreviewEdit";
import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

jest.mock("react-native", () => ({
  Image: {
    getSize: jest.fn(),
  },
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

describe("photoPreviewEdit", () => {
  describe("resolveImageDimensions", () => {
    it("resolves dimensions via Image.getSize for standard URIs", async () => {
      (Image.getSize as jest.Mock).mockImplementation((_uri, onSuccess) => {
        onSuccess(1200, 800);
      });

      const size = await resolveImageDimensions("file:///photo.jpg");
      expect(size).toEqual({ width: 1200, height: 800 });
    });

    it("falls back to ImageManipulator when Image.getSize fails (e.g. ph:// on iOS)", async () => {
      (Image.getSize as jest.Mock).mockImplementation((_uri, _onSuccess, onError) => {
        onError(new Error("Cannot load ph:// URI"));
      });
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        width: 1920,
        height: 1080,
      });

      const size = await resolveImageDimensions("ph://asset-123");
      expect(size).toEqual({ width: 1920, height: 1080 });
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith("ph://asset-123", [], {});
    });
  });

  describe("getContainedImageLayout", () => {
    it("letterboxes a wide image in a square container", () => {
      const layout = getContainedImageLayout(200, 200, 400, 200);
      expect(layout).toEqual({ x: 0, y: 50, width: 200, height: 100 });
    });

    it("pillarboxes a tall image in a square container", () => {
      const layout = getContainedImageLayout(200, 200, 100, 200);
      expect(layout).toEqual({ x: 50, y: 0, width: 100, height: 200 });
    });

    it("returns empty rect for invalid sizes", () => {
      expect(getContainedImageLayout(0, 100, 50, 50)).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    });
  });

  describe("mapCropRectToSourcePixels", () => {
    it("maps a full contained image to full source pixels", () => {
      const imageLayout = getContainedImageLayout(200, 200, 400, 200);
      const crop = mapCropRectToSourcePixels(imageLayout, imageLayout, 400, 200);
      expect(crop).toEqual({ originX: 0, originY: 0, width: 400, height: 200 });
    });

    it("maps a centered half-width crop", () => {
      const imageLayout = { x: 0, y: 50, width: 200, height: 100 };
      const cropInContainer = { x: 50, y: 50, width: 100, height: 100 };
      const crop = mapCropRectToSourcePixels(cropInContainer, imageLayout, 400, 200);
      expect(crop).toEqual({ originX: 100, originY: 0, width: 200, height: 200 });
    });

    it("returns null when crop misses the image", () => {
      const imageLayout = { x: 50, y: 50, width: 100, height: 100 };
      const cropInContainer = { x: 0, y: 0, width: 20, height: 20 };
      expect(mapCropRectToSourcePixels(cropInContainer, imageLayout, 400, 400)).toBeNull();
    });
  });

  describe("rotationCoverScale", () => {
    it("leaves an upright photo unscaled", () => {
      expect(rotationCoverScale(200, 100, 0)).toBe(1);
      expect(rotationCoverScale(200, 100, 180)).toBe(1);
    });

    it("scales a square at 45° by √2 so the frame has no empty corners", () => {
      expect(rotationCoverScale(100, 100, 45)).toBeCloseTo(Math.SQRT2, 5);
    });

    it("swaps a non-square photo at 90° enough to cover the original frame", () => {
      expect(rotationCoverScale(200, 100, 90)).toBe(2);
    });
  });

  describe("cropRotationCoverScale", () => {
    const image = { x: 0, y: 0, width: 200, height: 200 };

    it("does not scale when the crop is still covered", () => {
      const crop = { x: 50, y: 50, width: 100, height: 100 };
      expect(cropRotationCoverScale(image, crop, 20)).toBe(1);
    });

    it("scales a full-frame square at 45° so corners stay filled", () => {
      expect(cropRotationCoverScale(image, image, 45)).toBeCloseTo(Math.SQRT2, 4);
    });

    it("returns to 1 when a square is turned a full 90°", () => {
      expect(cropRotationCoverScale(image, image, 90)).toBe(1);
    });
  });

  describe("clampImagePan", () => {
    const image = { x: 0, y: 0, width: 200, height: 200 };

    it("lets a smaller crop slide until the photo edge meets the frame", () => {
      const crop = { x: 40, y: 40, width: 120, height: 120 };
      expect(clampImagePan(image, crop, 0, 1, { x: 80, y: -80 })).toEqual({ x: 40, y: -40 });
    });

    it("does not move a crop that already covers the whole photo", () => {
      expect(clampImagePan(image, image, 0, 1, { x: 40, y: 10 })).toEqual({ x: 0, y: 0 });
    });

    it("does not open empty corners on a full-frame square at 45°", () => {
      const scale = cropRotationCoverScale(image, image, 45);
      const clamped = clampImagePan(image, image, 45, scale, { x: 30, y: -20 });
      expect(clamped.x).toBeCloseTo(0, 3);
      expect(clamped.y).toBeCloseTo(0, 3);
    });

    it("shifts the saved crop by the opposite of the pan", () => {
      const crop = { x: 40, y: 40, width: 120, height: 120 };
      const offset = clampImagePan(image, crop, 0, 1, { x: 10, y: 0 });
      const frame = cropRectForImageOffset(crop, offset);
      expect(mapCropRectToSourcePixels(frame, image, 200, 200)).toEqual({
        originX: 30,
        originY: 40,
        width: 120,
        height: 120,
      });
    });
  });

  describe("mapCoverCropAfterRotation", () => {
    it("matches the full source when rotation is 0", () => {
      const imageLayout = { x: 10, y: 20, width: 200, height: 100 };
      const crop = mapCoverCropAfterRotation(imageLayout, imageLayout, 400, 200, 0);
      expect(crop).toEqual({ originX: 0, originY: 0, width: 400, height: 200 });
    });

    it("keeps a 45° square crop inside the expanded bitmap and centered", () => {
      const imageLayout = { x: 0, y: 0, width: 100, height: 100 };
      const crop = mapCoverCropAfterRotation(imageLayout, imageLayout, 100, 100, 45);
      expect(crop).not.toBeNull();
      const bitmap = 100 * Math.SQRT2;
      expect(crop!.originX).toBeGreaterThan(0);
      expect(crop!.originX + crop!.width).toBeLessThan(bitmap + 1);
      expect(crop!.width).toBeCloseTo(100 / Math.SQRT2, 0);
      expect(Math.abs(crop!.originX - (bitmap - crop!.width) / 2)).toBeLessThan(1.5);
    });
  });

  describe("dialPeekCenterY", () => {
    it("keeps the circle center fixed when only the markings turn", () => {
      const center = dialPeekCenterY(500, 200);
      expect(center).toBeLessThan(500);
      expect(dialPeekCenterY(500, 200)).toBe(center);
      const atRest = dialMarkOffset(0, 0, 200);
      const turned = dialMarkOffset(15, 15, 200);
      expect(atRest.x).toBeCloseTo(0, 5);
      expect(atRest.y).toBeCloseTo(200, 5);
      expect(turned.x).toBeCloseTo(atRest.x, 5);
      expect(turned.y).toBeCloseTo(atRest.y, 5);
      expect(dialMarkOffset(0, 15, 200).x).not.toBeCloseTo(0, 0);
    });
  });

  describe("getEditCanvasImageLayout", () => {
    it("scales contained image to 85% pad so full crop has finger room", () => {
      const full = getContainedImageLayout(200, 200, 400, 200);
      const padded = getEditCanvasImageLayout(200, 200, 400, 200, 0.85);
      expect(padded.width).toBeCloseTo(full.width * 0.85, 5);
      expect(padded.height).toBeCloseTo(full.height * 0.85, 5);
      expect(padded.x + padded.width / 2).toBeCloseTo(100, 5);
      expect(padded.y + padded.height / 2).toBeCloseTo(100, 5);
    });
  });

  describe("defaultCropRectInImageLayout", () => {
    it("defaults to the full image layout (no inset)", () => {
      const imageLayout = { x: 10, y: 20, width: 100, height: 80 };
      expect(defaultCropRectInImageLayout(imageLayout)).toEqual(imageLayout);
    });

    it("insets from the image layout when fraction is provided", () => {
      const imageLayout = { x: 10, y: 20, width: 100, height: 80 };
      const crop = defaultCropRectInImageLayout(imageLayout, 0.1);
      expect(crop).toEqual({ x: 20, y: 28, width: 80, height: 64 });
    });
  });
});
