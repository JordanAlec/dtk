# kafka plugin

Adds Kafka support to your dtk suite via [KafkaJS](https://kafka.js.org/).

Provides three methods on `ctx.services.kafka`: **produce**, **consume**, and **disconnect**.

---

## Installation

```bash
dtk add kafka
```

This copies `src/services/kafka.ts` and `src/types/kafka.ts` into your project, patches `suite.ts` and `types/suite.ts`, and installs `kafkajs`.

---

## Configuration

Add the following to your `.env` (the template is added automatically):

```
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=dtk-client
```

For multiple brokers, comma-separate them:

```
KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092
```

---

## Local development

A `docker-compose.yml` using [Redpanda](https://redpanda.com/) is included for local dev — Redpanda is fully Kafka-API-compatible and starts in seconds.

```bash
# from dtk/templates/plugins/kafka/
docker compose up -d

# connect on localhost:19092
KAFKA_BROKERS=localhost:19092
```

Redpanda Console (UI) is available at http://localhost:8080.

---

## Usage

```ts
import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .kafka({
    brokers: process.env.KAFKA_BROKERS!.split(",").map((b) => b.trim()),
    clientId: process.env.KAFKA_CLIENT_ID ?? "dtk-client",
  })
  .step("produce-message", async (ctx) => {
    await ctx.services.kafka.produce({
      topic: "my-topic",
      messages: [{ value: "hello" }],
    });
  })
  .step("consume-message", async (ctx) => {
    await ctx.services.kafka.consume({
      topic: "my-topic",
      groupId: "my-group",
      fromBeginning: true,
      handler: async ({ message }) => {
        console.log(message.value?.toString());
      },
    });
  })
  .step("disconnect", async (ctx) => {
    await ctx.services.kafka.disconnect();
  })
  .run("stopOnError");
```

---

## API

### `.kafka(config)`

| Field | Type | Required | Description |
|---|---|---|---|
| `brokers` | `string[]` | ✅ | List of broker addresses |
| `clientId` | `string` | | Kafka client identifier |
| `ssl` | `boolean` | | Enable TLS |
| `sasl` | `object` | | SASL credentials (`mechanism`, `username`, `password`) |

### `ctx.services.kafka.produce(options)`

Sends messages to a topic. Connects the producer on first call and reuses it for subsequent calls.

| Field | Type | Description |
|---|---|---|
| `topic` | `string` | Target topic |
| `messages` | `Message[]` | KafkaJS `Message` array |

### `ctx.services.kafka.consume(options)`

Subscribes to a topic and runs the consumer. Calling `consume()` a second time without calling `disconnect()` first will throw — KafkaJS does not allow re-subscribing a running consumer.

| Field | Type | Description |
|---|---|---|
| `topic` | `string` | Topic to subscribe to |
| `groupId` | `string` | Consumer group ID |
| `fromBeginning` | `boolean` | Read from the earliest offset (default: `false`) |
| `handler` | `(payload: EachMessagePayload) => Promise<void>` | Called for each message |

### `ctx.services.kafka.disconnect()`

Disconnects both producer and consumer and resets internal state. Safe to call even if neither was connected.
