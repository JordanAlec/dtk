import OpenAI from "openai";
import type { OpenAiConfig, OpenAiResponseFormat } from "./types.js";

export function createOpenAIService(config?: OpenAiConfig) {
  const client = config ? new OpenAI({ apiKey: config.apiKey }) : null;

  const ensureClient = (): OpenAI => {
    if (!client) throw new Error("openAi service is not configured -- call .openAi(config) on the suite");
    return client;
  };

  return {
    listModels: async () => ensureClient().models.list(),
    response: async (model: string, format: OpenAiResponseFormat, message: string) =>
      ensureClient().responses.create({
        model,
        input: message,
        text: { format: { type: format } },
      }),
  };
}
