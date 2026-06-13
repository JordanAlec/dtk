import { basicAuth } from './basic-auth.js';
import { bearerToken } from './bearer-token.js';
import { getClaimValues } from './token.js';

describe('basicAuth', () => {
  it('returns a Base64-encoded Basic auth header', async () => {
    const result = await basicAuth({ username: 'user', password: 'pass' });
    const expected = `Basic ${Buffer.from('user:pass').toString('base64')}`;
    expect(result).toBe(expected);
  });

  it('correctly encodes special characters in credentials', async () => {
    const result = await basicAuth({ username: 'user@domain.com', password: 'p@ss:word!' });
    const decoded = Buffer.from(result.replace('Basic ', ''), 'base64').toString('utf-8');
    expect(decoded).toBe('user@domain.com:p@ss:word!');
  });
});

describe('bearerToken', () => {
  it('combines prefix and token with a space', async () => {
    const result = await bearerToken({ token: 'abc123', prefix: 'Bearer' });
    expect(result).toBe('Bearer abc123');
  });

  it('uses whatever prefix is supplied', async () => {
    const result = await bearerToken({ token: 'tok', prefix: 'Token' });
    expect(result).toBe('Token tok');
  });
});

describe('getClaimValues', () => {
  function makeJwt(payload: object): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${encoded}.signature`;
  }

  it('decodes the payload section of a JWT', () => {
    const claims = getClaimValues(makeJwt({ sub: 'user-123', name: 'Test User' }));
    expect(claims.sub).toBe('user-123');
    expect(claims.name).toBe('Test User');
  });

  it('returns all claims present in the token', () => {
    const payload = { sub: '1', role: 'admin', org: 'acme', exp: '9999999999' };
    const claims = getClaimValues(makeJwt(payload));
    expect(claims).toMatchObject(payload);
  });
});
