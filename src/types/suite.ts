import type { HttpOptions } from "../lib/http.js";
import type { OAuthConfig, TokenResponse } from "./oauth.js";
import type { XeroItem } from "./xero.js";

export type { HttpOptions };

export interface StepContext {
  outputs: Record<string, unknown>;
  auth: {
    clientCredentials(config?: OAuthConfig): Promise<TokenResponse>;
    getClaimValues(token: string): Record<string, string>;
  };
  http: {
    get<T>(url: string, options?: HttpOptions): Promise<T>;
    post<TBody, TResponse>(url: string, body: TBody, options?: HttpOptions): Promise<TResponse>;
  };
  services: {
    xero: {
      getItemByCode(code: string, bearerToken?: string): Promise<XeroItem>;
    };
  };
}

export type StepFn = (ctx: StepContext) => Promise<unknown>;

export interface Step {
  name: string;
  fn: StepFn;
}
