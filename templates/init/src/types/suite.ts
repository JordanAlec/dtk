import type { HttpOptions } from "../lib/http.js";
import type { OAuthConfig, TokenResponse } from "./oauth.js";
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
