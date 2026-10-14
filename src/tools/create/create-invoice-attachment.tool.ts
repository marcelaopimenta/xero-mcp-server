import { z } from "zod";

import { createXeroInvoiceAttachment } from "../../handlers/xero-invoice-attachments.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const CreateInvoiceAttachmentTool = CreateXeroTool(
  "create-invoice-attachment",
  `Attach a file to an existing Xero invoice or bill.
The file is read from disk on the machine running this server, so pass a path, not file content. One file per call. Xero accepts PDF, PNG, JPG, GIF, TIF, CSV, TXT, XML and Office documents up to 10 MB.`,
  {
    invoiceId: z
      .string()
      .describe("The ID of the invoice or bill to attach the file to."),
    filePath: z
      .string()
      .describe("Path of the file to attach, for example /tmp/receipt.pdf."),
    includeOnline: z
      .boolean()
      .optional()
      .describe(
        "For accounts-receivable invoices only: also show the file to the invoice's online recipient. Ignored for bills.",
      ),
  },
  async ({ invoiceId, filePath, includeOnline }) => {
    const response = await createXeroInvoiceAttachment(
      invoiceId,
      filePath,
      includeOnline,
    );

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error attaching file: ${response.error}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Attachment uploaded successfully:",
            ...response.result.map((attachment) =>
              [
                `FileName: ${attachment.fileName}`,
                `Attachment ID: ${attachment.attachmentID}`,
                `Size: ${attachment.contentLength} bytes`,
              ].join("\n"),
            ),
          ].join("\n"),
        },
      ],
    };
  },
);

export default CreateInvoiceAttachmentTool;
