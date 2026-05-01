import { BearerTokenConfig } from "../types/bearer-token.js";

export async function bearerToken(config: BearerTokenConfig): Promise<string> {
  return `${config.prefix} ${config.token}`;
}
