import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.XERO_CLIENT_ID = "test-client-id";
  process.env.XERO_CLIENT_SECRET = "test-client-secret";
});

type ScopeCarrier = Record<string, string>;

describe("default Xero scopes", () => {
  it("request accounting.attachments, which the invoice attachment tools need", async () => {
    const { xeroClient } = await import("../xero-client.js");
    const scopes = xeroClient as unknown as ScopeCarrier;

    for (const name of ["XERO_DEFAULT_AUTH_SCOPES_V1", "XERO_DEFAULT_AUTH_SCOPES_V2"]) {
      expect(scopes[name].split(" ")).toContain("accounting.attachments");
    }
    expect(scopes.XERO_DEFAULT_AUTH_SCOPES_V1.split(" ")).toContain("accounting.transactions");
    expect(scopes.XERO_DEFAULT_AUTH_SCOPES_V2.split(" ")).toContain("accounting.invoices");
  });
});
