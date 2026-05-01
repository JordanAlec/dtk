import { httpGet } from "../lib/http.js";
import type { XeroItem, XeroConfig } from "../types.js";

export function createXeroService(config?: XeroConfig) {
  return {
    getItemByCode: async (code: string, bearerToken?: string): Promise<XeroItem> => {
      const headers: Record<string, string> = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
      return httpGet<XeroItem>(`${config!.baseUrl}/Items/${code}`, { headers });
    },
  };
}
