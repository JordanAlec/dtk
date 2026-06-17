import type { HttpOptions } from "./http.js";
import type { OAuthConfig, TokenResponse } from "./oauth.js";
import type { SqsConfig, SendMessageResult } from "./aws-sqs.js";
import type { SnsConfig, PublishResult } from "./aws-sns.js";
import type { DynamoConfig, PutItemResult, GetItemResult, QueryResult, DeleteItemResult, UpdateItemResult } from "./aws-dynamo.js";
import type { S3Config, UploadOptions, UploadFileResult, DownloadFileResult, PresignedUrlResult } from "./aws-s3.js";
import type { OpenAiConfig } from "./open-ai.js";
import type { Model } from "openai";
import type { Response as OpenAiApiResponse } from "openai/resources/responses/responses";
import type { SqlOps } from "./sql.js";
import type { MongoDocument, MongoFilter, MongoUpdate } from "./mongodb.js";
// dtk:type-imports

export type { HttpOptions };

export interface BasicAuthConfig { username: string; password: string; }
export interface BearerTokenConfig { token: string; prefix: string; }
export type { OAuthConfig, TokenResponse };

export interface StepContext {
  outputs: Record<string, unknown>;
  auth: {
    clientCredentials(config?: OAuthConfig): Promise<TokenResponse>;
    getClaimValues(token: string): Record<string, string>;
    basicAuth(config?: BasicAuthConfig): Promise<string>;
    bearerToken(config?: BearerTokenConfig): Promise<string>;
  };
  http: {
    get<T>(url: string, options?: HttpOptions): Promise<T>;
    post<TBody, TResponse>(url: string, body: TBody, options?: HttpOptions): Promise<TResponse>;
    put<TBody, TResponse>(url: string, body: TBody, options?: HttpOptions): Promise<TResponse>;
    delete(url: string, options?: HttpOptions): Promise<number>;
  };
  file: {
    read(path: string): Promise<string>;
    readJson<T = unknown>(path: string): Promise<T>;
    write(path: string, content: string): Promise<void>;
    writeJson(path: string, data: unknown, indent?: number): Promise<void>;
    append(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    delete(path: string): Promise<void>;
    ensureDir(path: string): Promise<void>;
    copy(src: string, dest: string): Promise<void>;
    move(src: string, dest: string): Promise<void>;
    list(path: string): Promise<string[]>;
  };
  services: {
        sqs: { sendMessage(body: string, attributes?: Record<string, string>): Promise<SendMessageResult>; };
    sns: { publish(message: string, subject?: string, attributes?: Record<string, string>): Promise<PublishResult>; };
    dynamo: { putItem(tableName: string, item: Record<string, any>): Promise<PutItemResult>; getItem(tableName: string, key: Record<string, any>): Promise<GetItemResult>; queryItems(tableName: string, params: Record<string, any>): Promise<QueryResult>; updateItem(tableName: string, key: Record<string, any>, params: Record<string, any>): Promise<UpdateItemResult>; deleteItem(tableName: string, key: Record<string, any>): Promise<DeleteItemResult>; scanItems(tableName: string, params?: Record<string, any>): Promise<QueryResult>; };
    s3: { uploadFile(bucket: string, key: string, filePath: string, options?: UploadOptions): Promise<UploadFileResult>; downloadFile(bucket: string, key: string, localPath: string): Promise<DownloadFileResult>; getPresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<PresignedUrlResult>; };
    openAi: { listModels(): Promise<{ data: Model[] }>; response(model: string, format: string, message: string): Promise<OpenAiApiResponse>; };
    redis: { get(key: string): Promise<string | null>; set(key: string, value: string, ttlSeconds?: number): Promise<void>; del(key: string): Promise<number>; exists(key: string): Promise<boolean>; expire(key: string, ttlSeconds: number): Promise<boolean>; hset(key: string, field: string, value: string): Promise<number>; hget(key: string, field: string): Promise<string | null>; keys(pattern: string): Promise<string[]>; quit(): Promise<void>; };
    sql: { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>; execute(sql: string, params?: unknown[]): Promise<number>; callProc<T = Record<string, unknown>>(name: string, params?: unknown[]): Promise<T[]>; transaction<T>(fn: (ops: SqlOps) => Promise<T>): Promise<T>; disconnect(): Promise<void>; };
    mongodb: { insertOne(collection: string, doc: MongoDocument): Promise<{ insertedId: string }>; insertMany(collection: string, docs: MongoDocument[]): Promise<{ insertedCount: number; insertedIds: string[] }>; findOne<T = MongoDocument>(collection: string, filter: MongoFilter): Promise<T | null>; find<T = MongoDocument>(collection: string, filter?: MongoFilter): Promise<T[]>; updateOne(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }>; updateMany(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }>; deleteOne(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }>; deleteMany(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }>; disconnect(): Promise<void>; };
// dtk:service-types
  };
}

export type StepFn = (ctx: StepContext) => Promise<unknown>;

export interface Step {
  name: string;
  fn: StepFn;
}

export type SuiteRunOption = "throwOnError" | "stopOnError";
