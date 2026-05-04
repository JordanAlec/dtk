import { createOpenAIService } from './service.js';

jest.mock('../../init/src/lib/http.js');
import { httpGet, httpPost } from '../../init/src/lib/http.js';

const mockHttpGet = jest.mocked(httpGet);
const mockHttpPost = jest.mocked(httpPost);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createOpenAIService', () => {
  const config = { baseUrl: 'https://api.openai.com' };
  const bearerToken = 'Bearer sk-test-token';

  describe('listModels', () => {
    it('calls the correct models endpoint with the bearer token', async () => {
      mockHttpGet.mockResolvedValue({ object: 'list', data: [] });
      const openAi = createOpenAIService(config);
      await openAi.listModels(bearerToken);
      expect(mockHttpGet).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        { headers: { Authorization: bearerToken } }
      );
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

  });
});
