import type { HttpOptions } from "./http.js";
import type { OAuthConfig, TokenResponse } from "./oauth.js";
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
  };
  services: {
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

export enum SuiteRunOption {
  ThrowOnError = "throwOnError",
  ContinueOnError = "continueOnError",
}
