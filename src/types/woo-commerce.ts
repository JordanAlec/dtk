export interface WooCommerceConfig {
  baseUrl: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  // TODO: Add more properties as needed
}