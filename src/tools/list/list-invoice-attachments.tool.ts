import { z } from "zod";

import { listXeroInvoiceAttachments } from "../../handlers/xero-invoice-attachments.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const ListInvoiceAttachmentsTool = CreateXeroTool(
  "list-invoice-attachments",
  `List the attachments already held on a Xero invoice or bill, with their file name, size and Xero URL.`,
  {
    invoiceId: z
      .string()
      .describe("The ID of the invoice or bill to list attachments for."),
  },
  async ({ invoiceId }) => {
    const response = await listXeroInvoiceAttachments(invoiceId);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing attachments: ${response.error}`,
          },
        ],
      };
    }

    if (response.result.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No attachments on invoice ${invoiceId}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Attachments on invoice ${invoiceId}:`,
            ...response.result.map((attachment) =>
              [
                `FileName: ${attachment.fileName}`,
                `Attachment ID: ${attachment.attachmentID}`,
                `Size: ${attachment.contentLength} bytes`,
                `URL: ${attachment.url}`,
              ].join("\n"),
            ),
          ].join("\n"),
        },
      ],
    };
  },
);

export default ListInvoiceAttachmentsTool;
