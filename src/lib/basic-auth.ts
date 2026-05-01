import { BasicAuthConfig } from "../types/basic-auth.js";

export async function basicAuth(config: BasicAuthConfig): Promise<string> {
  const token = Buffer.from(`${config!.username}:${config!.password}`).toString("base64");
  return `Basic ${token}`;
}
