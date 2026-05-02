import axios from "axios";

export interface HttpOptions {
  headers?: Record<string, string>;
}

function normalizeError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    const detail = data?.Detail ?? data?.message ?? err.message;
    return new Error(`HTTP ${status}: ${detail}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

export async function httpGet<T>(url: string, options?: HttpOptions): Promise<T> {
  try {
    const response = await axios.get<T>(url, { headers: options?.headers });
    return response.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function httpPost<TBody, TResponse>(
  url: string,
  body: TBody,
  options?: HttpOptions
): Promise<TResponse> {
  try {
    const response = await axios.post<TResponse>(url, body, { headers: options?.headers });
    return response.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function httpDelete(url: string, options?: HttpOptions): Promise<number> {
  try {
    const response = await axios.delete(url, { headers: options?.headers });
    return response.status;
  } catch (err) {
    throw normalizeError(err);
  }
}
