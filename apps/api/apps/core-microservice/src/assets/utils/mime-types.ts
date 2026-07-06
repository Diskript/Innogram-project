import * as mime from "mime-types";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
];

export const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export function isImage(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function isVideo(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

export function isAllowedType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

export function getExtensionFromMime(mimeType: string): string {
  return mime.extension(mimeType) || "bin";
}

export function getMimeFromExtension(ext: string): string {
  return mime.lookup(ext) || "application/octet-stream";
}
