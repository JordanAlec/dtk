import { createS3Service } from './service.js';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('fs/promises');

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readFile, writeFile } from 'fs/promises';

const mockSend = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));
});

describe('createS3Service', () => {
  const config = { region: 'us-east-1' };

  describe('uploadFile', () => {
    it('creates the S3 client with the configured region', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('content'));
      mockSend.mockResolvedValue({ ETag: '"abc123"' });
      const s3 = createS3Service({ region: 'eu-west-1' });
      await s3.uploadFile('my-bucket', 'key', './file.txt');
      expect(S3Client).toHaveBeenCalledWith({ region: 'eu-west-1' });
    });

    it('reads the local file and sends a PutObjectCommand with bucket, key, and body', async () => {
      const fileContent = Buffer.from('hello world');
      (readFile as jest.Mock).mockResolvedValue(fileContent);
      mockSend.mockResolvedValue({ ETag: '"abc123"' });
      const s3 = createS3Service(config);
      await s3.uploadFile('my-bucket', 'uploads/file.txt', './file.txt');
      const commandArg = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.Bucket).toBe('my-bucket');
      expect(commandArg.Key).toBe('uploads/file.txt');
      expect(commandArg.Body).toBe(fileContent);
    });

    it('includes ContentType when provided in options', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from(''));
      mockSend.mockResolvedValue({ ETag: '"abc123"' });
      const s3 = createS3Service(config);
      await s3.uploadFile('my-bucket', 'key', './file.txt', { contentType: 'text/plain' });
      const commandArg = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.ContentType).toBe('text/plain');
    });

    it('includes Metadata when provided in options', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from(''));
      mockSend.mockResolvedValue({ ETag: '"abc123"' });
      const s3 = createS3Service(config);
      await s3.uploadFile('my-bucket', 'key', './file.txt', { metadata: { source: 'dtk' } });
      const commandArg = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.Metadata).toEqual({ source: 'dtk' });
    });

    it('omits ContentType and Metadata when no options are provided', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from(''));
      mockSend.mockResolvedValue({ ETag: '"abc123"' });
      const s3 = createS3Service(config);
      await s3.uploadFile('my-bucket', 'key', './file.txt');
      const commandArg = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.ContentType).toBeUndefined();
      expect(commandArg.Metadata).toBeUndefined();
    });

    it('returns the bucket, key, and etag from the response', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from(''));
      mockSend.mockResolvedValue({ ETag: '"abc123"' });
      const s3 = createS3Service(config);
      const result = await s3.uploadFile('my-bucket', 'uploads/file.txt', './file.txt');
      expect(result).toEqual({ bucket: 'my-bucket', key: 'uploads/file.txt', etag: '"abc123"' });
    });

    it('returns null etag when not present in the response', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from(''));
      mockSend.mockResolvedValue({});
      const s3 = createS3Service(config);
      const result = await s3.uploadFile('my-bucket', 'key', './file.txt');
      expect(result.etag).toBeNull();
    });
  });

  describe('downloadFile', () => {
    it('sends a GetObjectCommand with the bucket and key', async () => {
      const mockBody = { transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array()) };
      mockSend.mockResolvedValue({ Body: mockBody, ContentType: 'text/plain' });
      (writeFile as jest.Mock).mockResolvedValue(undefined);
      const s3 = createS3Service(config);
      await s3.downloadFile('my-bucket', 'uploads/file.txt', './local.txt');
      const commandArg = (GetObjectCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.Bucket).toBe('my-bucket');
      expect(commandArg.Key).toBe('uploads/file.txt');
    });

    it('writes the response body to the local path', async () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]);
      const mockBody = { transformToByteArray: jest.fn().mockResolvedValue(bytes) };
      mockSend.mockResolvedValue({ Body: mockBody, ContentType: 'text/plain' });
      (writeFile as jest.Mock).mockResolvedValue(undefined);
      const s3 = createS3Service(config);
      await s3.downloadFile('my-bucket', 'uploads/file.txt', './local.txt');
      expect(writeFile).toHaveBeenCalledWith('./local.txt', bytes);
    });

    it('returns bucket, key, localPath, and contentType', async () => {
      const mockBody = { transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array()) };
      mockSend.mockResolvedValue({ Body: mockBody, ContentType: 'application/json' });
      (writeFile as jest.Mock).mockResolvedValue(undefined);
      const s3 = createS3Service(config);
      const result = await s3.downloadFile('my-bucket', 'uploads/file.txt', './local.txt');
      expect(result).toEqual({ bucket: 'my-bucket', key: 'uploads/file.txt', localPath: './local.txt', contentType: 'application/json' });
    });

    it('returns undefined contentType when not present in the response', async () => {
      const mockBody = { transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array()) };
      mockSend.mockResolvedValue({ Body: mockBody });
      (writeFile as jest.Mock).mockResolvedValue(undefined);
      const s3 = createS3Service(config);
      const result = await s3.downloadFile('my-bucket', 'key', './local.txt');
      expect(result.contentType).toBeUndefined();
    });
  });

  describe('getPresignedUrl', () => {
    it('returns a presigned URL for the given bucket and key', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.example.com/presigned');
      const s3 = createS3Service(config);
      const result = await s3.getPresignedUrl('my-bucket', 'uploads/file.txt');
      expect(result.url).toBe('https://s3.example.com/presigned');
    });

    it('defaults expiresIn to 3600 when not provided', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.example.com/presigned');
      const s3 = createS3Service(config);
      const result = await s3.getPresignedUrl('my-bucket', 'uploads/file.txt');
      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 3600 });
      expect(result.expiresIn).toBe(3600);
    });

    it('uses the provided expiresIn value', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.example.com/presigned');
      const s3 = createS3Service(config);
      const result = await s3.getPresignedUrl('my-bucket', 'key', 300);
      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 300 });
      expect(result.expiresIn).toBe(300);
    });

    it('returns bucket and key alongside url and expiresIn', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.example.com/presigned');
      const s3 = createS3Service(config);
      const result = await s3.getPresignedUrl('my-bucket', 'uploads/file.txt', 300);
      expect(result).toEqual({ url: 'https://s3.example.com/presigned', expiresIn: 300, bucket: 'my-bucket', key: 'uploads/file.txt' });
    });
  });
});
