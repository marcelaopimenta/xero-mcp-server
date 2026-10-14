import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";

/** Xero rejects attachments above 10 MB. */
export const XERO_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Accepted attachment extensions mapped to their content type. The type is
 * derived from the file name instead of being trusted from the caller, so the
 * upload cannot declare a type that disagrees with the file it sends.
 */
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const XERO_ATTACHMENT_EXTENSIONS = Object.keys(MIME_TYPES);

export const mimeTypeFor = (fileName: string): string | undefined =>
  MIME_TYPES[extname(fileName).toLowerCase()];

export interface AttachmentUpload {
  /** Xero uses this name verbatim for the attachment. */
  fileName: string;
  mimeType: string;
  body: Buffer;
}

/**
 * Read and validate a local attachment before it is sent to Xero.
 *
 * The file is buffered whole: Xero caps attachments at 10 MB, so the memory
 * cost is bounded, and a Buffer stays valid for a retry where a one-shot
 * stream would not.
 */
export async function readAttachment(
  filePath: string,
): Promise<AttachmentUpload> {
  const fileName = basename(filePath);
  const mimeType = mimeTypeFor(fileName);

  if (!mimeType) {
    throw new Error(
      `Unsupported attachment type "${extname(fileName) || fileName}". ` +
        `Xero accepts: ${XERO_ATTACHMENT_EXTENSIONS.join(", ")}.`,
    );
  }

  const { size } = await stat(filePath);

  if (size > XERO_ATTACHMENT_MAX_BYTES) {
    throw new Error(
      `Attachment is ${(size / 1024 / 1024).toFixed(2)} MB; ` +
        `Xero's limit is ${XERO_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB.`,
    );
  }

  return { fileName, mimeType, body: await readFile(filePath) };
}
