/** Fail-closed evidence: never persist a write when chosen photos did not all upload. */

export function chosenPhotosAllUploaded(
  chosenCount: number,
  uploadedCount: number,
): boolean {
  if (chosenCount <= 0) {
    return true;
  }
  return uploadedCount === chosenCount;
}

export function evidencePhotosFailedMessage(
  uploadedCount: number,
  chosenCount: number,
): string {
  const failedCount = Math.max(0, chosenCount - uploadedCount);
  return `${uploadedCount} of ${chosenCount} photo(s) uploaded. ${failedCount} failed. Your note and photos are still here — try again.`;
}
