export interface XeroConfig {
  baseUrl: string;
}

export interface XeroItem {
  ItemID: string;
  Code: string;
  Description: string;
  PurchaseDescription: string;
  UpdatedDateUTC: string;
  PurchaseDetails: {
    UnitPrice: number;
    AccountCode: string;
    TaxType: string;
  };
  SalesDetails: {
    UnitPrice: number;
    AccountCode: string;
    TaxType: string;
  };
  Name: string;
  IsTrackedAsInventory: boolean;
  IsSold: boolean;
  IsPurchased: boolean;
}
