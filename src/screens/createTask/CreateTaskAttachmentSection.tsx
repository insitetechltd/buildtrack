import React from "react";

import FileUploadHarness, {
  type FileUploadItem,
} from "../../components/ui/FileUploadHarness";
import { useTranslation } from "../../utils/useTranslation";

interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
}

type Attachment = string | SelectedPhoto;

interface CreateTaskAttachmentSectionProps {
  attachments: Attachment[];
  asyncStoragePhotoCount?: number;
  onRemoveAttachment: (index: number) => void;
  onAddPhotos: () => void;
  embedded?: boolean;
}

function toHarnessItems(
  attachments: Attachment[],
  onRemoveAttachment: (index: number) => void,
): FileUploadItem[] {
  return attachments.map((attachment, index) => {
    const uri =
      typeof attachment === "string" ? attachment : (attachment.annotatedUri || attachment.uri);
    return {
      id: `attachment-${index}-${typeof attachment === "string" ? attachment : attachment.uri}`,
      uri,
      onRemove: () => onRemoveAttachment(index),
    };
  });
}

export default function CreateTaskAttachmentSection({
  attachments,
  asyncStoragePhotoCount = 0,
  onRemoveAttachment,
  onAddPhotos,
  embedded = false,
}: CreateTaskAttachmentSectionProps) {
  const t = useTranslation();
  const attachmentCount = attachments.length + asyncStoragePhotoCount;

  return (
    <FileUploadHarness
      title="Add photos / files"
      countLabel={attachmentCount > 0 ? t.createTask.filesAdded(attachmentCount) : undefined}
      items={toHarnessItems(attachments, onRemoveAttachment)}
      onAdd={onAddPhotos}
      embedded={embedded}
      testID="create-task__attachments_section"
      ctaTestID="create-task__attachments_cta"
      addTestID="createTask-add-photos"
      plusIconTestID="create-task__attachments_cta_plus_icon"
      previewTestIDPrefix="create-task__attachment_preview"
      removeTestIDPrefix="create-task__attachment_preview_remove"
    />
  );
}
