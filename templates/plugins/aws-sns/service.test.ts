import { createSnsService } from './sns.js';

jest.mock('@aws-sdk/client-sns');
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const mockSend = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (SNSClient as jest.Mock).mockImplementation(() => ({ send: mockSend }));
});

describe('createSnsService', () => {
  const config = { topicArn: 'arn:aws:sns:us-east-1:123:my-topic', region: 'us-east-1' };

  it('returns the messageId from the SNS response', async () => {
    mockSend.mockResolvedValue({ MessageId: 'pub-abc-123' });
    const sns = createSnsService(config);
    const result = await sns.publish('hello');
    expect(result).toEqual({ messageId: 'pub-abc-123' });
  });

  it('creates the SNS client with the configured region', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sns = createSnsService({ ...config, region: 'ap-southeast-2' });
    await sns.publish('test');
    expect(SNSClient).toHaveBeenCalledWith({ region: 'ap-southeast-2' });
  });

  it('sends the message and topic ARN in the command', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sns = createSnsService(config);
    await sns.publish('my notification');
    const commandArg = (PublishCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.Message).toBe('my notification');
    expect(commandArg.TopicArn).toBe(config.topicArn);
  });

  it('includes Subject in the command when provided', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sns = createSnsService(config);
    await sns.publish('body', 'Alert: something happened');
    const commandArg = (PublishCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.Subject).toBe('Alert: something happened');
  });

  it('omits Subject when not provided', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sns = createSnsService(config);
    await sns.publish('body');
    const commandArg = (PublishCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.Subject).toBeUndefined();
  });

  it('maps string attributes to the SNS MessageAttribute format', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sns = createSnsService(config);
    await sns.publish('body', undefined, { source: 'my-runbook', tier: 'prod' });
    const commandArg = (PublishCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.MessageAttributes).toEqual({
      source: { DataType: 'String', StringValue: 'my-runbook' },
      tier:   { DataType: 'String', StringValue: 'prod' },
    });
  });

  it('omits MessageAttributes when none are provided', async () => {
    mockSend.mockResolvedValue({ MessageId: 'id' });
    const sns = createSnsService(config);
    await sns.publish('body');
    const commandArg = (PublishCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(commandArg.MessageAttributes).toBeUndefined();
  });

  it('propagates errors from the SNS client', async () => {
    mockSend.mockRejectedValue(new Error('SNS unavailable'));
    const sns = createSnsService(config);
    await expect(sns.publish('body')).rejects.toThrow('SNS unavailable');
  });
});
