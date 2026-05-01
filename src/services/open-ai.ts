import { OpenAiConfig, OpenAiListModels, OpenAiResponse, OpenAiResponseBody } from "../types.js";
import { httpGet, httpPost } from "../lib/http.js";

// TODO: This could be simplied by using the OpenAI SDK.
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