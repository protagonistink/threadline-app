import { useState, useRef, useCallback } from 'react';
import { prepareImageAttachment } from '@/components/ink/imageAttachments';
import type { ChatMessage } from '@/types/electron';

type Attachment = NonNullable<ChatMessage['attachments']>[number];

export interface AttachmentsState {
  attachments: Attachment[];
  isDraggingFiles: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export interface AttachmentsActions {
  addImageAttachments: (files: FileList | null) => Promise<void>;
  removeAttachment: (index: number) => void;
  setDraggingFiles: (dragging: boolean) => void;
  clearAttachments: () => void;
  /** Take current attachments and reset. Used when sending a message. */
  consumeAttachments: () => Attachment[];
}

export function useAttachments(): { state: AttachmentsState; actions: AttachmentsActions } {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImageAttachments = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    const prepared = await Promise.all(imageFiles.map((file) => prepareImageAttachment(file)));
    setAttachments((prev) => [...prev, ...prepared]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setIsDraggingFiles(false);
  }, []);

  const consumeAttachments = useCallback((): Attachment[] => {
    const current = attachments;
    setAttachments([]);
    setIsDraggingFiles(false);
    return current;
  }, [attachments]);

  return {
    state: { attachments, isDraggingFiles, fileInputRef },
    actions: { addImageAttachments, removeAttachment, setDraggingFiles: setIsDraggingFiles, clearAttachments, consumeAttachments },
  };
}
