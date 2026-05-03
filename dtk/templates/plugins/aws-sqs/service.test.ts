import { createSqsService } from './service.js';

jest.mock('@aws-sdk/client-sqs');
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const mockSend = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (SQSClient as jest.Mock).mockImplementation(() => ({ send: mockSend }));
});

describe('createSqsService', () => {
  const config = { queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/my-queue', region: 'us-east-1' };

  it('returns the messageId from the SQS response', async () => {
    mockSend.mockResolvedValue({ MessageId: 'msg-abc-123' });
    const sqs = createSqsService(config);
    const result = await sqs.sendMessage('hello');
    expect(result).toEqual({ messageId: 'msg-abc-123' });
  });

  it('returns null messageId when not present in the response', async () => {
    mockSend.mockResolvedValue({});
    const sqs = createSqsService(config);
    const result = await sqs.sendMessage('hello');
    expect(result.messageId).toBeNull();
  });

  it('sends the message body and queue URL in the command', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sqs = createSqsService(config);
    await sqs.sendMessage('my message body');
    const commandArg = (SendMessageCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.MessageBody).toBe('my message body');
    expect(commandArg.QueueUrl).toBe(config.queueUrl);
  });

  it('maps string attributes to the SQS MessageAttribute format', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sqs = createSqsService(config);
    await sqs.sendMessage('body', { source: 'my-runbook', env: 'test' });
    const commandArg = (SendMessageCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.MessageAttributes).toEqual({
      source: { DataType: 'String', StringValue: 'my-runbook' },
      env:    { DataType: 'String', StringValue: 'test' },
    });
  });

  it('omits MessageAttributes when none are provided', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sqs = createSqsService(config);
    await sqs.sendMessage('body');
    const commandArg = (SendMessageCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.MessageAttributes).toBeUndefined();
  });


});
