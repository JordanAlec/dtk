import { httpGet, httpPost, httpPut, httpDelete, HttpError, RateLimiter } from './http.js';

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

describe('HttpError', () => {
  it('throws HttpError with status, url, method and body on an axios error', async () => {
    const body = { Detail: 'Not found' };
    mockAxios.get.mockRejectedValue({ response: { status: 404, data: body }, message: 'Request failed' });
    mockAxios.isAxiosError.mockReturnValue(true);

    const err = await httpGet('https://api.example.com/item').catch((e) => e) as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(404);
    expect(err.url).toBe('https://api.example.com/item');
    expect(err.method).toBe('GET');
    expect(err.body).toEqual(body);
    expect(err.message).toBe('HTTP 404: Not found');
  });

  it('sets the correct method for POST, PUT and DELETE', async () => {
    const axiosError = { response: { status: 500, data: {} }, message: 'err' };
    mockAxios.isAxiosError.mockReturnValue(true);

    mockAxios.post.mockRejectedValue(axiosError);
    const postErr = await httpPost('https://api.example.com/items', {}).catch((e) => e) as HttpError;
    expect(postErr.method).toBe('POST');

    mockAxios.put.mockRejectedValue(axiosError);
    const putErr = await httpPut('https://api.example.com/items/1', {}).catch((e) => e) as HttpError;
    expect(putErr.method).toBe('PUT');

    mockAxios.delete.mockRejectedValue(axiosError);
    const deleteErr = await httpDelete('https://api.example.com/items/1').catch((e) => e) as HttpError;
    expect(deleteErr.method).toBe('DELETE');
  });

  it('does not throw HttpError for non-axios errors', async () => {
    mockAxios.get.mockRejectedValue(new Error('network failure'));
    const err = await httpGet('https://api.example.com/item').catch((e) => e) as Error;
    expect(err).not.toBeInstanceOf(HttpError);
    expect(err.message).toBe('network failure');
  });
});

describe('timeout', () => {
  it('passes timeoutMs to axios as timeout', async () => {
    mockAxios.get.mockResolvedValue({ data: {} });
    await httpGet('https://api.example.com/item', { timeoutMs: 5000 });
    expect(mockAxios.get).toHaveBeenCalledWith('https://api.example.com/item', {
      headers: undefined,
      timeout: 5000,
    });
  });

  it('does not include timeout in axios config when timeoutMs is not set', async () => {
    mockAxios.get.mockResolvedValue({ data: {} });
    await httpGet('https://api.example.com/item');
    expect(mockAxios.get).toHaveBeenCalledWith('https://api.example.com/item', {
      headers: undefined,
    });
  });

  it('passes timeoutMs through for POST, PUT and DELETE', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });
    await httpPost('https://api.example.com/items', {}, { timeoutMs: 3000 });
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.example.com/items',
      {},
      { headers: undefined, timeout: 3000 }
    );

    mockAxios.put.mockResolvedValue({ data: {} });
    await httpPut('https://api.example.com/items/1', {}, { timeoutMs: 3000 });
    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://api.example.com/items/1',
      {},
      { headers: undefined, timeout: 3000 }
    );

    mockAxios.delete.mockResolvedValue({ status: 204 });
    await httpDelete('https://api.example.com/items/1', { timeoutMs: 3000 });
    expect(mockAxios.delete).toHaveBeenCalledWith(
      'https://api.example.com/items/1',
      { headers: undefined, timeout: 3000 }
    );
  });
});

describe('rate limiter', () => {
  it('calls rateLimiter.throttle() before a GET request', async () => {
    mockAxios.get.mockResolvedValue({ data: {} });
    const rateLimiter = { throttle: jest.fn().mockResolvedValue(undefined) };
    await httpGet('https://api.example.com/item', { rateLimiter });
    expect(rateLimiter.throttle).toHaveBeenCalledTimes(1);
  });

  it('calls rateLimiter.throttle() on every retry attempt', async () => {
    mockAxios.get
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ data: {} });
    const rateLimiter = { throttle: jest.fn().mockResolvedValue(undefined) };
    await httpGet('https://api.example.com/item', {
      rateLimiter,
      retry: { attempts: 1, delayMs: 0, retryOn: () => true },
    });
    expect(rateLimiter.throttle).toHaveBeenCalledTimes(2);
  });

  it('calls rateLimiter.throttle() before POST, PUT and DELETE', async () => {
    const rateLimiter = { throttle: jest.fn().mockResolvedValue(undefined) };

    mockAxios.post.mockResolvedValue({ data: {} });
    await httpPost('https://api.example.com/items', {}, { rateLimiter });
    expect(rateLimiter.throttle).toHaveBeenCalledTimes(1);

    mockAxios.put.mockResolvedValue({ data: {} });
    await httpPut('https://api.example.com/items/1', {}, { rateLimiter });
    expect(rateLimiter.throttle).toHaveBeenCalledTimes(2);

    mockAxios.delete.mockResolvedValue({ status: 204 });
    await httpDelete('https://api.example.com/items/1', { rateLimiter });
    expect(rateLimiter.throttle).toHaveBeenCalledTimes(3);
  });
});

describe('RateLimiter', () => {
  it('resolves immediately when under the request limit', async () => {
    const limiter = new RateLimiter(3, 1000);
    await expect(limiter.throttle()).resolves.toBeUndefined();
    await expect(limiter.throttle()).resolves.toBeUndefined();
    await expect(limiter.throttle()).resolves.toBeUndefined();
  });

  it('delays the next request when the window limit is reached', async () => {
    const limiter = new RateLimiter(1, 100);
    const start = Date.now();
    await limiter.throttle();
    await limiter.throttle();
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
  });

  it('throws when maxRequests is 0', () => {
    expect(() => new RateLimiter(0, 1000)).toThrow('RateLimiter: maxRequests must be greater than 0');
  });

  it('throws when maxRequests is negative', () => {
    expect(() => new RateLimiter(-1, 1000)).toThrow('RateLimiter: maxRequests must be greater than 0');
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
