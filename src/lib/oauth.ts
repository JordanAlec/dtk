import { httpPost } from "./http.js";
import type { OAuthConfig, TokenResponse } from "../types.js";

export async function clientCredentials(config: OAuthConfig): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    ...(config.scope ? { scope: config.scope } : {}),
  });

  return httpPost<URLSearchParams, TokenResponse>(config.tokenUrl, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}
