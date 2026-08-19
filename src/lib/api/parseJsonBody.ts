import { NextResponse } from "next/server";

export type ParseJsonBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Parses the JSON body of a Request, returning a clean 400 response
 * (in French) instead of throwing when the body is missing or malformed.
 */
export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<ParseJsonBodyResult<T>> {
  try {
    const data = (await request.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { _global: ["Requête invalide : le corps de la requête est illisible."] } },
        { status: 400 }
      ),
    };
  }
}
