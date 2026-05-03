import { createSnsService } from './service.js';

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

  it('returns null messageId when not present in the response', async () => {
    mockSend.mockResolvedValue({});
    const sns = createSnsService(config);
    const result = await sns.publish('hello');
    expect(result.messageId).toBeNull();
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

});
