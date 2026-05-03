import { clientCredentials } from './oauth.js';

jest.mock('./http.js');
import { httpPost } from './http.js';

const mockHttpPost = jest.mocked(httpPost);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('clientCredentials', () => {
  const config = {
    clientId: 'my-client',
    clientSecret: 'my-secret',
    tokenUrl: 'https://auth.example.com/token',
  };

  const tokenResponse = {
    access_token: 'tok123',
    token_type: 'Bearer',
    expires_in: 3600,
  };

  it('posts to the tokenUrl and returns the token response', async () => {
    mockHttpPost.mockResolvedValue(tokenResponse);
    const result = await clientCredentials(config);
    expect(result).toEqual(tokenResponse);
    expect(mockHttpPost).toHaveBeenCalledWith(
      config.tokenUrl,
      expect.any(URLSearchParams),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  });

  it('sends client_id, client_secret, and grant_type in the body', async () => {
    mockHttpPost.mockResolvedValue(tokenResponse);
    await clientCredentials(config);

    const body = mockHttpPost.mock.calls[0][1] as URLSearchParams;
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('my-client');
    expect(body.get('client_secret')).toBe('my-secret');
  });

  it('includes scope in the body when provided', async () => {
    mockHttpPost.mockResolvedValue(tokenResponse);
    await clientCredentials({ ...config, scope: 'openid profile' });

    const body = mockHttpPost.mock.calls[0][1] as URLSearchParams;
    expect(body.get('scope')).toBe('openid profile');
  });

  it('omits scope from the body when not provided', async () => {
    mockHttpPost.mockResolvedValue(tokenResponse);
    await clientCredentials(config);

    const body = mockHttpPost.mock.calls[0][1] as URLSearchParams;
    expect(body.has('scope')).toBe(false);
  });
});
