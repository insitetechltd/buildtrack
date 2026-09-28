import {
  chosenPhotosAllUploaded,
  evidencePhotosFailedMessage,
} from "../evidencePhotoSubmit";

describe("evidencePhotoSubmit", () => {
  it("allows a note-only submit when no photos were chosen", () => {
    expect(chosenPhotosAllUploaded(0, 0)).toBe(true);
  });

  it("blocks persist when any chosen photo failed to upload", () => {
    expect(chosenPhotosAllUploaded(2, 1)).toBe(false);
    expect(chosenPhotosAllUploaded(1, 0)).toBe(false);
  });

  it("allows persist only when every chosen photo uploaded", () => {
    expect(chosenPhotosAllUploaded(2, 2)).toBe(true);
  });

  it("tells the user the write was not saved", () => {
    expect(evidencePhotosFailedMessage(1, 2)).toBe(
      "1 of 2 photo(s) uploaded. 1 failed. Your note and photos are still here — try again.",
    );
  });
});
