import { OpenAiConfig, OpenAiListModels, OpenAiResponse, OpenAiResponseBody } from "../types/open-ai.js";
import { httpGet, httpPost } from "../lib/http.js";

export function createOpenAIService(config?: OpenAiConfig) {
  return {
    listModels: async (bearerToken: string): Promise<OpenAiListModels> => {
      const headers: Record<string, string> = { Authorization: bearerToken };
      const models = await httpGet<OpenAiListModels>(`${config!.baseUrl}/v1/models`, { headers });
      return models;
    },
    response: async (bearerToken: string, model: string, format: string, message: string): Promise<OpenAiResponse> => {
      const headers: Record<string, string> = { Authorization: bearerToken };
      const body = {
        model: model,
        input: message,
        text: {
          format: {
            type: format
          }
        }
      };
      const response = await httpPost<OpenAiResponseBody, OpenAiResponse>(`${config!.baseUrl}/v1/responses`, body, { headers });
      return response;
    }
  };
}
