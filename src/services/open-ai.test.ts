import { createOpenAIService } from './open-ai.js';

jest.mock('../lib/http.js');
import { httpGet, httpPost } from '../lib/http.js';

const mockHttpGet = jest.mocked(httpGet);
const mockHttpPost = jest.mocked(httpPost);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createOpenAIService', () => {
  const config = { baseUrl: 'https://api.openai.com' };
  const bearerToken = 'Bearer sk-test-token';

  describe('listModels', () => {
    it('calls the correct models endpoint', async () => {
      mockHttpGet.mockResolvedValue({ object: 'list', data: [] });
      const openAi = createOpenAIService(config);
      await openAi.listModels(bearerToken);
      expect(mockHttpGet).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        { headers: { Authorization: bearerToken } }
      );
    });

    it('returns the model list from the response', async () => {
      const models = { object: 'list', data: [{ id: 'gpt-4o', object: 'model', created: 0, owned_by: 'openai' }] };
      mockHttpGet.mockResolvedValue(models);
      const openAi = createOpenAIService(config);
      const result = await openAi.listModels(bearerToken);
      expect(result).toEqual(models);
    });
  });

  describe('response', () => {
    it('calls the correct responses endpoint', async () => {
      mockHttpPost.mockResolvedValue({ id: 'resp-1' });
      const openAi = createOpenAIService(config);
      await openAi.response(bearerToken, 'gpt-4o-mini', 'text', 'Say hello.');
      expect(mockHttpPost).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.any(Object),
        { headers: { Authorization: bearerToken } }
      );
    });

    it('sends the correct request body', async () => {
      mockHttpPost.mockResolvedValue({ id: 'resp-1' });
      const openAi = createOpenAIService(config);
      await openAi.response(bearerToken, 'gpt-4o-mini', 'json_object', 'Return JSON.');
      const body = mockHttpPost.mock.calls[0][1];
      expect(body).toMatchObject({
        model: 'gpt-4o-mini',
        input: 'Return JSON.',
        text: { format: { type: 'json_object' } },
      });
    });

    it('returns the response from the API', async () => {
      const apiResponse = { id: 'resp-abc', status: 'completed', output: [] };
      mockHttpPost.mockResolvedValue(apiResponse);
      const openAi = createOpenAIService(config);
      const result = await openAi.response(bearerToken, 'gpt-4o-mini', 'text', 'Hi');
      expect(result).toEqual(apiResponse);
    });
  });
});
