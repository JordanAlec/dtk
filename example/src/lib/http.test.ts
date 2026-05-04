import { httpGet, httpPost, httpPut, httpDelete } from './http.js';

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

});

describe('httpPut', () => {
  it('returns the response data on success', async () => {
    mockAxios.put.mockResolvedValue({ data: { updated: true } });
    const result = await httpPut('https://api.example.com/items/1', { name: 'updated' });
    expect(result).toEqual({ updated: true });
  });

  it('passes the request body and headers to axios', async () => {
    mockAxios.put.mockResolvedValue({ data: {} });
    await httpPut('https://api.example.com/items/1', { key: 'value' }, { headers: { 'Content-Type': 'application/json' } });
    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://api.example.com/items/1',
      { key: 'value' },
      { headers: { 'Content-Type': 'application/json' } }
    );
  });

});

describe('httpDelete', () => {
  it('returns the response status code on success', async () => {
    mockAxios.delete.mockResolvedValue({ status: 204 });
    const status = await httpDelete('https://api.example.com/item/1');
    expect(status).toBe(204);
  });
});

describe('retry', () => {
  it('retries and succeeds when retryOn returns true', async () => {
    mockAxios.get
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await httpGet('https://api.example.com/item', {
      retry: { attempts: 1, delayMs: 0, retryOn: () => true },
    });

    expect(result).toEqual({ ok: true });
    expect(mockAxios.get).toHaveBeenCalledTimes(2);
  });

  it('does not retry when retryOn returns false', async () => {
    mockAxios.get.mockRejectedValue(new Error('fatal'));

    await expect(
      httpGet('https://api.example.com/item', {
        retry: { attempts: 3, delayMs: 0, retryOn: () => false },
      })
    ).rejects.toThrow('fatal');

    expect(mockAxios.get).toHaveBeenCalledTimes(1);
  });

  it('exhausts all attempts and throws when retryOn always returns true', async () => {
    mockAxios.get.mockRejectedValue(new Error('always fails'));

    await expect(
      httpGet('https://api.example.com/item', {
        retry: { attempts: 2, delayMs: 0, retryOn: () => true },
      })
    ).rejects.toThrow('always fails');

    expect(mockAxios.get).toHaveBeenCalledTimes(3);
  });

  it('does not retry when no retryOn predicate is provided', async () => {
    mockAxios.get.mockRejectedValue(new Error('no predicate'));

    await expect(
      httpGet('https://api.example.com/item', {
        retry: { attempts: 3, delayMs: 0 },
      })
    ).rejects.toThrow('no predicate');

    expect(mockAxios.get).toHaveBeenCalledTimes(1);
  });

  it('passes the raw error to the retryOn predicate', async () => {
    const err = new Error('check me');
    mockAxios.get.mockRejectedValue(err);
    const retryOn = jest.fn().mockReturnValue(false);

    await expect(
      httpGet('https://api.example.com/item', {
        retry: { attempts: 1, delayMs: 0, retryOn },
      })
    ).rejects.toThrow();

    expect(retryOn).toHaveBeenCalledWith(err);
  });

  it('respects exponential backoff and maxDelayMs across multiple retries', async () => {
    mockAxios.get
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ data: 'recovered' });

    const result = await httpGet('https://api.example.com/item', {
      retry: {
        attempts: 2,
        delayMs: 0,
        backoff: 'exponential',
        maxDelayMs: 100,
        retryOn: () => true,
      },
    });

    expect(result).toBe('recovered');
    expect(mockAxios.get).toHaveBeenCalledTimes(3);
  });

  it('does not retry when attempts is 0', async () => {
    mockAxios.get.mockRejectedValue(new Error('fail'));

    await expect(
      httpGet('https://api.example.com/item', {
        retry: { attempts: 0, delayMs: 0, retryOn: () => true },
      })
    ).rejects.toThrow('fail');

    expect(mockAxios.get).toHaveBeenCalledTimes(1);
  });
});
