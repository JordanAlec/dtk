import axios from "axios";

export interface HttpOptions {
  headers?: Record<string, string>;
}

export async function httpGet<T>(url: string, options?: HttpOptions): Promise<T> {
  const response = await axios.get<T>(url, { headers: options?.headers });
  return response.data;
}

export async function httpPost<TBody, TResponse>(
  url: string,
  body: TBody,
  options?: HttpOptions
): Promise<TResponse> {
  const response = await axios.post<TResponse>(url, body, { headers: options?.headers });
  return response.data;
}
