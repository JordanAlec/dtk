export interface DynamoConfig {
  region: string;
}

export interface PutItemResult {
  success: boolean;
  tableName: string;
  itemCount: number;
}

export interface GetItemResult {
  item: Record<string, any> | null;
  found: boolean;
}

export interface QueryResult {
  items: Record<string, any>[];
  count: number;
}

export interface DeleteItemResult {
  success: boolean;
  tableName: string;
}

export interface UpdateItemResult {
  success: boolean;
  tableName: string;
}
