import type { ApiErrorShape } from "../shared/domain";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly details: ApiErrorShape["error"]) {
    super(details.message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) headers.set("content-type", "application/json");
  const response = await fetch(`/api${path}`, { ...init, headers, credentials: "same-origin" });
  if (!response.ok) {
    const fallback: ApiErrorShape = { error: { code: "request_failed", message: "The request failed.", requestId: "unknown" } };
    const details = await response.json().catch(() => fallback) as ApiErrorShape;
    throw new ApiError(response.status, details.error);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function jsonBody(value: unknown): RequestInit {
  return { body: JSON.stringify(value) };
}
