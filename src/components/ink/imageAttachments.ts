import type { ChatImageAttachment } from '@/types';

const MAX_IMAGE_DIMENSION = 1600;
const OUTPUT_QUALITY = 0.82;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Could not read image.'));
    };
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = dataUrl;
  });
}

function normalizeImageType(type: string): ChatImageAttachment['mediaType'] {
  if (type === 'image/png' || type === 'image/webp') {
    return type;
  }
  return 'image/jpeg';
}

export async function prepareImageAttachment(file: File): Promise<ChatImageAttachment> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceDataUrl);
  const mediaType = normalizeImageType(file.type);

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not prepare image.');
  }

  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL(mediaType, mediaType === 'image/png' ? undefined : OUTPUT_QUALITY);

  return {
    kind: 'image',
    dataUrl,
    mediaType,
    name: file.name || 'image',
  };
}
