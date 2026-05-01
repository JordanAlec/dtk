import type { HttpOptions } from "../lib/http.js";
import type { OAuthConfig, TokenResponse } from "./oauth.js";
import type { XeroItem } from "./xero.js";
import type { SendMessageResult, PublishResult } from "./aws.js";
import { WooCommerceProduct } from "./woo-commerce.js";
import { BasicAuthConfig } from "../index.js";

export type { HttpOptions };

export interface StepContext {
  outputs: Record<string, unknown>;
  auth: {
    clientCredentials(config?: OAuthConfig): Promise<TokenResponse>;
    getClaimValues(token: string): Record<string, string>;
    basicAuth(config?: BasicAuthConfig): Promise<string>;
  };
  http: {
    get<T>(url: string, options?: HttpOptions): Promise<T>;
    post<TBody, TResponse>(url: string, body: TBody, options?: HttpOptions): Promise<TResponse>;
  };
  services: {
    xero: {
      getItems(bearerToken?: string): Promise<XeroItem[]>;
      getItemByCode(code: string, bearerToken?: string): Promise<XeroItem>;
      deleteItem(itemId: string, bearerToken?: string): Promise<number>;
    };
    woo: {
      getProducts(perPage: number, page: number, basicAuthHeader: string): Promise<WooCommerceProduct[]>;
      getProductByCode(code: string, basicAuthHeader: string): Promise<WooCommerceProduct>;
    },
    sqs: {
      sendMessage(body: string, attributes?: Record<string, string>): Promise<SendMessageResult>;
    };
    sns: {
      publish(message: string, subject?: string, attributes?: Record<string, string>): Promise<PublishResult>;
    };
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