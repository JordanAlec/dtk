export interface OpenAiConfig {
  baseUrl: string;
}

export interface OpenAiListModels {
  object: string;
  data: OpenAiModel[];
}

export interface OpenAiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface OpenAiResponseBody {
  model: string;
  input: string;
  text?: {
    format: {
      type: string;
    }
  }
}

export interface OpenAiResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  background: boolean;
  billing: {
    payer: string;
  };
  error: unknown;
  incomplete_details: unknown;
  instructions: unknown;
  max_output_tokens: unknown;
  max_tool_calls: unknown;
  model: string;
  output: [
    {
      id: string;
      type: string;
      status: string;
      content: [
        {
          type: string;
          annotations: unknown;
          logprobs: unknown;
          text: string;
        }
      ];
      role: string;
    }
  ];
  parallel_tool_calls: boolean;
}
