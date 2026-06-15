import { createOpenAIService } from './service.js';
import OpenAI from 'openai';

jest.mock('openai');

const MockOpenAI = jest.mocked(OpenAI);

describe('createOpenAIService', () => {
  const config = { apiKey: 'sk-test-token' };
  let mockList: jest.Mock;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockList = jest.fn();
    mockCreate = jest.fn();
    MockOpenAI.mockImplementation(() => ({
      models: { list: mockList },
      responses: { create: mockCreate },
    }) as unknown as OpenAI);
  });

  describe('listModels', () => {
    it('calls models.list', async () => {
      mockList.mockResolvedValue({ data: [] });
      const openAi = createOpenAIService(config);
      await openAi.listModels();
      expect(mockList).toHaveBeenCalled();
    });
  });

  describe('response', () => {
    it('calls responses.create with correct args', async () => {
      mockCreate.mockResolvedValue({ id: 'resp-1' });
      const openAi = createOpenAIService(config);
      await openAi.response('gpt-4o-mini', 'text', 'Say hello.');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        input: 'Say hello.',
        text: { format: { type: 'text' } },
      });
    });

    it('passes format in request body', async () => {
      mockCreate.mockResolvedValue({ id: 'resp-1' });
      const openAi = createOpenAIService(config);
      await openAi.response('gpt-4o-mini', 'json_object', 'Return JSON.');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ text: { format: { type: 'json_object' } } })
      );
    });
  });
});
