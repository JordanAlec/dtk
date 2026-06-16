import { Suite } from '../suite.js';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const suite = new Suite()
  .kafka({
    brokers,
    clientId: process.env.KAFKA_CLIENT_ID ?? 'dtk',
    groupId: process.env.KAFKA_GROUP_ID ?? 'dtk-runbook',
  });

await suite.run('kafka example', async ({ services }) => {
  await services.kafka.produce('dtk-example', {
    key: 'hello',
    value: JSON.stringify({ message: 'hello from dtk' }),
  });

  await services.kafka.disconnect();
});
