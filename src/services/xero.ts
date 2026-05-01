import { httpGet, httpDelete } from "../lib/http.js";
import type { XeroItem, XeroConfig, XeroEnvelope } from "../types.js";

export function createXeroService(config?: XeroConfig) {
  return {
    getItems: async (bearerToken?: string): Promise<XeroItem[]> => {
      const headers: Record<string, string> = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
      const envelope = await httpGet<XeroEnvelope<"Items", XeroItem>>(`${config!.baseUrl}/Items`, { headers });
      return envelope.Items;
    },
    getItemByCode: async (code: string, bearerToken?: string): Promise<XeroItem> => {
      const headers: Record<string, string> = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
      const envelope = await httpGet<XeroEnvelope<"Items", XeroItem>>(`${config!.baseUrl}/Items/${code}`, { headers });
      return envelope.Items[0];
    },
    deleteItem: async (itemId: string, bearerToken?: string): Promise<number> => {
      const headers: Record<string, string> = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
      return httpDelete(`${config!.baseUrl}/Items/${itemId}`, { headers });
    }
  };
}
