import type { BasicAuthConfig } from "../types/suite.js";

export async function basicAuth(config: BasicAuthConfig): Promise<string> {
  const token = Buffer.from(`${config!.username}:${config!.password}`).toString("base64");
  return `Basic ${token}`;
}
