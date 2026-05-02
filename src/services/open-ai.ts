import { OpenAiConfig, OpenAiListModels, OpenAiResponse, OpenAiResponseBody } from "../types.js";
import { httpGet, httpPost } from "../lib/http.js";

export function createOpenAIService(config?: OpenAiConfig) {
  return {
    listModels: async (bearerToken: string): Promise<OpenAiListModels> =>
      httpGet<OpenAiListModels>(`${config!.baseUrl}/v1/models`, { headers: { Authorization: bearerToken } }),

    response: async (bearerToken: string, model: string, format: string, message: string): Promise<OpenAiResponse> =>
      httpPost<OpenAiResponseBody, OpenAiResponse>(
        `${config!.baseUrl}/v1/responses`,
        { model, input: message, text: { format: { type: format } } },
        { headers: { Authorization: bearerToken } }
      ),
  };
}