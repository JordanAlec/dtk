import type { OpenAiConfig, OpenAiListModels, OpenAiResponse, OpenAiResponseBody, OpenAiResponseFormat } from "../types/open-ai.js";
import { httpGet, httpPost } from "../lib/http.js";

export function createOpenAIService(config?: OpenAiConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error("openAi service is not configured -- call .openAi(config) on the suite");
  };

  return {
    listModels: async (bearerToken: string): Promise<OpenAiListModels> => {
      ensureConfig();
      const headers: Record<string, string> = { Authorization: bearerToken };
      return httpGet<OpenAiListModels>(`${config!.baseUrl}/v1/models`, { headers });
    },
    response: async (bearerToken: string, model: string, format: OpenAiResponseFormat, message: string): Promise<OpenAiResponse> => {
      ensureConfig();
      const headers: Record<string, string> = { Authorization: bearerToken };
      const body: OpenAiResponseBody = {
        model,
        input: message,
        text: { format: { type: format } },
      };
      return httpPost<OpenAiResponseBody, OpenAiResponse>(`${config!.baseUrl}/v1/responses`, body, { headers });
    },
  };
}
