import type { SelectedPhoto } from "./usePhotoSelection";

export type TaskAttachment = string | SelectedPhoto;

/** Stable identity for draft photos vs durable URLs. */
export function taskAttachmentKey(attachment: TaskAttachment): string {
  if (typeof attachment === "string") {
    return `url:${attachment}`;
  }
  if (attachment.mediaLibraryAssetId) {
    return `ml:${attachment.mediaLibraryAssetId}`;
  }
  return `uri:${attachment.uri}`;
}

/**
 * Upsert incoming attachments into existing by identity.
 * Preserves existing order; appends truly new items; incoming wins on conflict (edits).
 */
export function mergeUniqueAttachments(
  existing: TaskAttachment[],
  incoming: TaskAttachment[],
): TaskAttachment[] {
  if (incoming.length === 0) {
    return existing;
  }

  const incomingByKey = new Map(
    incoming.map((item) => [taskAttachmentKey(item), item] as const),
  );
  const used = new Set<string>();
  const result: TaskAttachment[] = [];

  for (const item of existing) {
    const key = taskAttachmentKey(item);
    if (incomingByKey.has(key)) {
      result.push(incomingByKey.get(key)!);
      used.add(key);
      continue;
    }
    result.push(item);
  }

  for (const item of incoming) {
    const key = taskAttachmentKey(item);
    if (used.has(key)) {
      continue;
    }
    result.push(item);
    used.add(key);
  }

  if (
    result.length === existing.length &&
    result.every((item, idx) => item === existing[idx])
  ) {
    return existing;
  }

  return result;
}
