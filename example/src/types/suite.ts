import type { HttpOptions } from "./http.js";
import type { OAuthConfig, TokenResponse } from "./oauth.js";
import type { DynamoConfig, PutItemResult, GetItemResult, QueryResult, DeleteItemResult, UpdateItemResult } from "./aws-dynamo.js";
import type { S3Config, UploadOptions, UploadFileResult, DownloadFileResult, PresignedUrlResult } from "./aws-s3.js";
import type { SqsConfig, SendMessageResult } from "./aws-sqs.js";
import type { SnsConfig, PublishResult } from "./aws-sns.js";
import type { OpenAiConfig, OpenAiListModels, OpenAiResponse } from "./open-ai.js";
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
  services: {
        dynamo: { putItem(tableName: string, item: Record<string, any>): Promise<PutItemResult>; getItem(tableName: string, key: Record<string, any>): Promise<GetItemResult>; queryItems(tableName: string, params: Record<string, any>): Promise<QueryResult>; updateItem(tableName: string, key: Record<string, any>, params: Record<string, any>): Promise<UpdateItemResult>; deleteItem(tableName: string, key: Record<string, any>): Promise<DeleteItemResult>; scanItems(tableName: string, params?: Record<string, any>): Promise<QueryResult>; };
    s3: { uploadFile(bucket: string, key: string, filePath: string, options?: UploadOptions): Promise<UploadFileResult>; downloadFile(bucket: string, key: string, localPath: string): Promise<DownloadFileResult>; getPresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<PresignedUrlResult>; };
    sqs: { sendMessage(body: string, attributes?: Record<string, string>): Promise<SendMessageResult>; };
    sns: { publish(message: string, subject?: string, attributes?: Record<string, string>): Promise<PublishResult>; };
    openAi: { listModels(bearerToken: string): Promise<OpenAiListModels>; response(bearerToken: string, model: string, format: string, message: string): Promise<OpenAiResponse>; };
// dtk:service-types
  };
}

export type StepFn = (ctx: StepContext) => Promise<unknown>;

export interface Step {
  name: string;
  fn: StepFn;
}

export type SuiteRunOption = "throwOnError" | "stopOnError";
