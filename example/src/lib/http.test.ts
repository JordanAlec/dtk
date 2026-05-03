import { httpGet, httpPost, httpDelete } from './http.js';

jest.mock('axios');
import axios from 'axios';

const mockAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAxios.isAxiosError.mockReturnValue(false);
});

describe('httpGet', () => {
  it('returns the response data on success', async () => {
    mockAxios.get.mockResolvedValue({ data: { id: 1, name: 'item' } });
    const result = await httpGet<{ id: number; name: string }>('https://api.example.com/item');
    expect(result).toEqual({ id: 1, name: 'item' });
  });

  it('passes headers through to axios', async () => {
    mockAxios.get.mockResolvedValue({ data: {} });
    await httpGet('https://api.example.com/item', { headers: { Authorization: 'Bearer tok' } });
    expect(mockAxios.get).toHaveBeenCalledWith('https://api.example.com/item', {
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('normalizes an axios error using response.data.Detail', async () => {
    const axiosError = { response: { status: 404, data: { Detail: 'Not found' } }, message: 'Request failed' };
    mockAxios.get.mockRejectedValue(axiosError);
    mockAxios.isAxiosError.mockReturnValue(true);
    await expect(httpGet('https://api.example.com/item')).rejects.toThrow('HTTP 404: Not found');
  });

  it('normalizes an axios error using response.data.message when Detail is absent', async () => {
    const axiosError = { response: { status: 500, data: { message: 'Internal error' } }, message: 'Request failed' };
    mockAxios.get.mockRejectedValue(axiosError);
    mockAxios.isAxiosError.mockReturnValue(true);
    await expect(httpGet('https://api.example.com/item')).rejects.toThrow('HTTP 500: Internal error');
  });

  it('falls back to err.message when response data has no recognised error field', async () => {
    const axiosError = { response: { status: 503, data: {} }, message: 'Service unavailable' };
    mockAxios.get.mockRejectedValue(axiosError);
    mockAxios.isAxiosError.mockReturnValue(true);
    await expect(httpGet('https://api.example.com/item')).rejects.toThrow('HTTP 503: Service unavailable');
  });

  it('rethrows a plain Error unchanged when it is not an axios error', async () => {
    const err = new Error('network failure');
    mockAxios.get.mockRejectedValue(err);
    await expect(httpGet('https://api.example.com/item')).rejects.toThrow('network failure');
  });
});

describe('httpPost', () => {
  it('returns the response data on success', async () => {
    mockAxios.post.mockResolvedValue({ data: { created: true } });
    const result = await httpPost('https://api.example.com/items', { name: 'new' });
    expect(result).toEqual({ created: true });
  });

  it('passes the request body and headers to axios', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });
    await httpPost('https://api.example.com/items', { key: 'value' }, { headers: { 'Content-Type': 'application/json' } });
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.example.com/items',
      { key: 'value' },
      { headers: { 'Content-Type': 'application/json' } }
    );
  });

  it('normalizes axios errors the same way as httpGet', async () => {
    const axiosError = { response: { status: 400, data: { Detail: 'Bad request' } }, message: 'x' };
    mockAxios.post.mockRejectedValue(axiosError);
    mockAxios.isAxiosError.mockReturnValue(true);
    await expect(httpPost('https://api.example.com/items', {})).rejects.toThrow('HTTP 400: Bad request');
  });
});

describe('httpDelete', () => {
  it('returns the response status code on success', async () => {
    mockAxios.delete.mockResolvedValue({ status: 204 });
    const status = await httpDelete('https://api.example.com/item/1');
    expect(status).toBe(204);
  });
});
