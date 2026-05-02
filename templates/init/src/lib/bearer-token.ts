import type { BearerTokenConfig } from "../types/suite.js";

export async function bearerToken(config: BearerTokenConfig): Promise<string> {
  return `${config.prefix} ${config.token}`;
}
