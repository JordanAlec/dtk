export interface MongoConfig {
  uri: string;
  database: string;
}

export type MongoDocument = Record<string, unknown>;
export type MongoFilter = Record<string, unknown>;
export type MongoUpdate = Record<string, unknown>;
