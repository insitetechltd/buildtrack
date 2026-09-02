import {
  defaultCropRectInImageLayout,
  getContainedImageLayout,
  mapCropRectToSourcePixels,
  resolveImageDimensions,
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

  describe("defaultCropRectInImageLayout", () => {
    it("insets from the image layout", () => {
      const imageLayout = { x: 10, y: 20, width: 100, height: 80 };
      const crop = defaultCropRectInImageLayout(imageLayout, 0.1);
      expect(crop).toEqual({ x: 20, y: 28, width: 80, height: 64 });
    });
  });
});
