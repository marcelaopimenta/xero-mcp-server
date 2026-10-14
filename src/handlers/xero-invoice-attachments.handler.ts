import { Attachment } from "xero-node";

import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { readAttachment } from "../helpers/xero-attachment.js";
import { XeroClientResponse } from "../types/tool-response.js";

/** Xero requires the content type of an upload to match the file's bytes. */
const withContentType = (mimeType: string) => ({
  headers: {
    ...getClientHeaders().headers,
    "Content-Type": mimeType,
  },
});

async function uploadAttachment(
  invoiceId: string,
  filePath: string,
  includeOnline?: boolean,
): Promise<Attachment[]> {
  await xeroClient.authenticate();

  const { fileName, mimeType, body } = await readAttachment(filePath);

  const response =
    await xeroClient.accountingApi.createInvoiceAttachmentByFileName(
      xeroClient.tenantId,
      invoiceId,
      fileName,
      body,
      includeOnline, // only meaningful for ACCREC invoices
      undefined, // idempotencyKey
      withContentType(mimeType),
    );

  return response.body.attachments ?? [];
}

/**
 * Attach a local file to a Xero invoice or bill.
 */
export async function createXeroInvoiceAttachment(
  invoiceId: string,
  filePath: string,
  includeOnline?: boolean,
): Promise<XeroClientResponse<Attachment[]>> {
  try {
    const attachments = await uploadAttachment(
      invoiceId,
      filePath,
      includeOnline,
    );

    return { result: attachments, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}

async function listAttachments(invoiceId: string): Promise<Attachment[]> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getInvoiceAttachments(
    xeroClient.tenantId,
    invoiceId,
    getClientHeaders(),
  );

  return response.body.attachments ?? [];
}

/**
 * List the attachments already held on a Xero invoice or bill.
 */
export async function listXeroInvoiceAttachments(
  invoiceId: string,
): Promise<XeroClientResponse<Attachment[]>> {
  try {
    const attachments = await listAttachments(invoiceId);

    return { result: attachments, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
