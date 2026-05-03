import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, DeleteItemCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import type { QueryCommandInput, ScanCommandInput, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { DynamoConfig, PutItemResult, GetItemResult, QueryResult, DeleteItemResult, UpdateItemResult } from "./types.js";

export function createDynamoService(config?: DynamoConfig) {
  if (!config) throw new Error("dynamo service is not configured -- call .dynamo(config) on the suite");
  const client = new DynamoDBClient({ region: config.region });

  return {
    putItem: async (tableName: string, item: Record<string, any>): Promise<PutItemResult> => {
      const marshalledItem = marshall(item);
      await client.send(
        new PutItemCommand({
          TableName: tableName,
          Item: marshalledItem,
        })
      );
      return {
        success: true,
        tableName,
        itemCount: Object.keys(item).length,
      };
    },

    getItem: async (tableName: string, key: Record<string, any>): Promise<GetItemResult> => {
      const marshalledKey = marshall(key);
      const response = await client.send(
        new GetItemCommand({
          TableName: tableName,
          Key: marshalledKey,
        })
      );

      if (!response.Item) {
        return { item: null, found: false };
      }

      const unmarshalledItem = unmarshall(response.Item);
      return { item: unmarshalledItem, found: true };
    },

    queryItems: async (tableName: string, params: Omit<QueryCommandInput, 'TableName'>): Promise<QueryResult> => {
      const response = await client.send(new QueryCommand({ TableName: tableName, ...params }));
      const items = (response.Items ?? []).map((item) => unmarshall(item));
      return { items, count: items.length };
    },

    deleteItem: async (tableName: string, key: Record<string, any>): Promise<DeleteItemResult> => {
      await client.send(new DeleteItemCommand({ TableName: tableName, Key: marshall(key) }));
      return { success: true, tableName };
    },

    updateItem: async (tableName: string, key: Record<string, any>, params: Omit<UpdateItemCommandInput, 'TableName' | 'Key'>): Promise<UpdateItemResult> => {
      await client.send(new UpdateItemCommand({ TableName: tableName, Key: marshall(key), ...params }));
      return { success: true, tableName };
    },

    scanItems: async (tableName: string, params: Omit<ScanCommandInput, 'TableName'> = {}): Promise<QueryResult> => {
      const response = await client.send(new ScanCommand({ TableName: tableName, ...params }));
      const items = (response.Items ?? []).map((item) => unmarshall(item));
      return { items, count: items.length };
    },
  };
}
