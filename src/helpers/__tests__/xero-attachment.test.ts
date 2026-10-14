import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  XERO_ATTACHMENT_MAX_BYTES,
  mimeTypeFor,
  readAttachment,
} from "../xero-attachment.js";

const tempFile = async (name: string, contents: string | Buffer) => {
  const dir = await mkdtemp(join(tmpdir(), "xero-attachment-"));
  const path = join(dir, name);
  await writeFile(path, contents);
  return path;
};

describe("mimeTypeFor", () => {
  it("maps a known extension regardless of case", () => {
    expect(mimeTypeFor("Invoice.PDF")).toBe("application/pdf");
    expect(mimeTypeFor("scan.jpeg")).toBe("image/jpeg");
  });

  it("returns undefined for a type Xero rejects", () => {
    expect(mimeTypeFor("payload.exe")).toBeUndefined();
  });
});

describe("readAttachment", () => {
  it("returns the basename, the mime type and the bytes", async () => {
    const path = await tempFile("receipt.pdf", "%PDF-1.4 test");

    const upload = await readAttachment(path);

    expect(upload.fileName).toBe("receipt.pdf");
    expect(upload.mimeType).toBe("application/pdf");
    expect(upload.body.toString()).toBe("%PDF-1.4 test");
  });

  it("rejects an unsupported extension", async () => {
    const path = await tempFile("payload.exe", "MZ");

    await expect(readAttachment(path)).rejects.toThrow(
      /Unsupported attachment type/,
    );
  });

  it("rejects a file above the 10 MB limit", async () => {
    const path = await tempFile(
      "big.pdf",
      Buffer.alloc(XERO_ATTACHMENT_MAX_BYTES + 1),
    );

    await expect(readAttachment(path)).rejects.toThrow(/10 MB/);
  });

  it("surfaces a missing file", async () => {
    await expect(readAttachment("/nope/missing.pdf")).rejects.toThrow();
  });
});
