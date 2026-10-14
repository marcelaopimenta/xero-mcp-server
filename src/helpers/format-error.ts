import { AxiosError } from "axios";

const HTTP_STATUS_MESSAGES: Record<number, string> = {
    401: "Authentication failed. Please check your Xero credentials.",
    403: "You don't have permission to access this resource in Xero.",
    404: "The requested resource was not found in Xero.",
    429: "Too many requests to Xero. Please try again in a moment.",
};

function asObject(value: unknown): Record<string, unknown> | undefined {
    if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
    if (typeof value !== "string") return undefined;
    try {
        const parsed: unknown = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
    } catch {
        return undefined;
    }
}

function numeric(value: unknown): number | undefined {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function text(value: unknown): string | undefined {
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
    return undefined;
}

/** A xero-node rejection is `{ response, body }`; the response carries status or statusCode. */
function statusOf(error: Record<string, unknown>): number | undefined {
    const response = asObject(error.response);
    if (response === undefined) return undefined;
    return typeof response.statusCode === "number" ? response.statusCode : numeric(response.status);
}

/**
 * Format error messages for return to the LLM.
 *
 * Never stringify unknown error objects  the xero-node SDK rejects with a
 * plain object whose `request.headers.authorization` field contains the
 * caller's Bearer token. Only whitelisted fields (status, title, detail) are
 * extracted so secrets never reach the response.
 */
export function formatError(error: unknown): string {
    if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const detail = text((error.response?.data as Record<string, unknown> | undefined)?.Detail);
        const mapped = statusCode !== undefined ? HTTP_STATUS_MESSAGES[statusCode] : undefined;
        return mapped ?? detail ?? "An error occurred while communicating with Xero.";
    }

    // xero-node@13 also rejects with a JSON string built from the response body.
    const payload = typeof error === "string" ? asObject(error) : (error as Record<string, unknown> | null | undefined);
    const response = payload === undefined || payload === null ? undefined : asObject(payload.response);
    const source =
        payload === undefined || payload === null
            ? undefined
            : (asObject(payload.body) ?? asObject(response?.body) ?? payload);
    const problem = asObject(source?.problem);

    const statusCode =
        (payload === undefined || payload === null ? undefined : statusOf(payload)) ??
        numeric(source?.status) ??
        numeric(source?.httpStatusCode);
    const title =
        text(problem?.title) ??
        text(source?.Title) ??
        text(source?.title) ??
        text(source?.httpStatusCode) ??
        text(source?.status);
    const detail = text(problem?.detail) ?? text(source?.Detail) ?? text(source?.detail);

    if (statusCode !== undefined) {
        const mapped = HTTP_STATUS_MESSAGES[statusCode];
        const summary = detail !== undefined ? `${statusCode} ${title ?? "HTTP error"}: ${detail}` : `${statusCode} ${title ?? "HTTP error"}`;
        if (mapped !== undefined) return detail !== undefined ? `${mapped} (${statusCode} ${detail})` : mapped;
        return summary;
    }
    if (title !== undefined || detail !== undefined) {
        return detail !== undefined ? `${title ?? "HTTP error"}: ${detail}` : (title as string);
    }
    if (error instanceof Error) return error.message;

    return "An unexpected error occurred while communicating with Xero.";
}
