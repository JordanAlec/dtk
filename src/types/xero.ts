export interface XeroConfig {
  baseUrl: string;
}

export type XeroEnvelope<K extends string, T> = { [key in K]: T[] } & {
  Id: string;
  Status: string;
  ProviderName: string;
  DateTimeUTC: string;
};

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
