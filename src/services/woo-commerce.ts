import { httpGet } from "../lib/http.js";
import { WooCommerceConfig, WooCommerceProduct } from "../types.js";

export function createWooCommerceService(config?: WooCommerceConfig) {
  return {
    getProducts: async (perPage: number, page: number, basicAuthHeader: string): Promise<WooCommerceProduct[]> => {
      const headers: Record<string, string> = { Authorization: basicAuthHeader };
      const products = await httpGet<WooCommerceProduct[]>(`${config!.baseUrl}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`, { headers });
      return products;
    },
    getProductByCode: async (code: string, basicAuthHeader: string): Promise<WooCommerceProduct> => {
      const headers: Record<string, string> = { Authorization: basicAuthHeader };
      const products = await httpGet<WooCommerceProduct[]>(`${config!.baseUrl}/wp-json/wc/v3/products?sku=${code}`, { headers });
      return products[0];
    },
  };
}