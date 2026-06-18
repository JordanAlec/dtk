# Changelog

All notable changes to dtk are documented here, starting from 1.3.1.

Since dtk generates files that you own, there is no automatic upgrade path. Each release notes what changed and which files to update manually if you want to adopt the changes.

---

## [1.5.0] - 2026-06-16

### Added

- **mongodb plugin**: new plugin for reading and writing documents using the native MongoDB Node.js driver (`mongodb` npm package). No query builder or ORM -- direct driver calls that mirror the shape of the driver API while returning clean, serialisable result objects.

#### Available methods

| Method | Description |
|---|---|
| `insertOne(collection, doc)` | Inserts a single document; returns `{ insertedId: string }` |
| `insertMany(collection, docs)` | Inserts multiple documents; returns `{ insertedCount: number; insertedIds: string[] }` |
| `findOne<T>(collection, filter)` | Returns the first matching document as `T`, or `null` if nothing matches |
| `find<T>(collection, filter?)` | Returns all matching documents as `T[]`; omit the filter to return all documents in the collection |
| `updateOne(collection, filter, update)` | Updates the first matching document; returns `{ matchedCount: number; modifiedCount: number }` |
| `updateMany(collection, filter, update)` | Updates all matching documents; returns `{ matchedCount: number; modifiedCount: number }` |
| `deleteOne(collection, filter)` | Deletes the first matching document; returns `{ deletedCount: number }` |
| `deleteMany(collection, filter)` | Deletes all matching documents; returns `{ deletedCount: number }` |
| `disconnect()` | Closes the connection pool -- must always be called in a `finally` block |

The service connects lazily on the first call and reuses the connection for all subsequent calls. `disconnect()` closes the pool and resets the client so the next call reconnects cleanly.

#### Connection pattern

MongoDB holds an open connection pool. Unlike plugins that are wired through the suite builder, the service should be created outside the suite so `disconnect()` can be guaranteed in a `finally` block regardless of whether a step fails:

```ts
import "../load-env.js";
import { suite } from "../suite.js";
import { createMongoService } from "../services/mongodb.js";

const mongo = createMongoService({
  uri: process.env.MONGODB_URI!,
  database: process.env.MONGODB_DATABASE ?? 'dtk',
});

try {
  await suite()
    .step("insert", async () => {
      const result = await mongo.insertOne("users", { name: "Alice", active: true });
      console.log("inserted id:", result.insertedId);
      return result;
    })
    .step("find-active", async () => {
      const users = await mongo.find<{ name: string; active: boolean }>("users", { active: true });
      console.log("active users:", users);
      return users;
    })
    .step("update", async () => {
      return mongo.updateOne("users", { name: "Alice" }, { $set: { active: false } });
    })
    .step("delete-inactive", async () => {
      return mongo.deleteMany("users", { active: false });
    })
    .run("stopOnError");
} finally {
  await mongo.disconnect();
}
```

> Always use `stopOnError` rather than `throwOnError` so that every step runs before the `finally` block executes. With `throwOnError`, an early step failure throws immediately and the remaining steps do not run -- but `finally` still runs, so `disconnect()` is still safe either way.

#### Local Docker service

A Docker Compose file is provided at `tools/mongodb/` for local development:

```bash
cd tools/mongodb
docker compose up -d
```

Set the following in your project's `.env`:

```
MONGODB_URI=mongodb://dtk:dtk@localhost:27017/dtk?authSource=admin
MONGODB_DATABASE=dtk
```

Credentials: user `dtk`, password `dtk`, database `dtk`. The auth source is `admin` because the root user is created in the `admin` database by the official MongoDB image.

On first start, `tools/mongodb/init/seed.js` runs automatically and creates:

- `users` collection with three sample documents
- `accounts` collection with two seeded documents

To reset and re-seed:

```bash
docker compose down -v
docker compose up -d
```

---

### Adopting the mongodb plugin

#### New to mongodb in your project

If you have never set up a mongodb integration manually, this is a single command:

```bash
dtk add mongodb
```

This will:

1. Copy `src/services/mongodb.ts` into your project
2. Copy `src/types/mongodb.ts` into your project
3. Copy `src/services/mongodb.test.ts` into your project
4. Patch `src/suite.ts` to add the import, config field, and builder method (all idempotent -- safe to run again if already partially applied)
5. Patch `src/types/suite.ts` to add the `mongodb` service shape to `StepContext`
6. Append `MONGODB_URI` and `MONGODB_DATABASE` to `.env.template`
7. Create `src/runbooks/mongodb.ts` with a working example
8. Add `runbook:mongodb` to `package.json`
9. Run `npm install mongodb`

That is everything. No further manual steps are required.

---

#### Already have a manual mongodb integration

If you previously wired up your own mongodb service by hand, `dtk add mongodb` will still run safely but may not overwrite what you have (files are not overwritten if they already exist). Use the file contents below to bring your project in line with the standard plugin layout, picking up whichever pieces you are missing.

---

**1. `src/types/mongodb.ts` -- create or replace**

```ts
export interface MongoConfig {
  uri: string;
  database: string;
}

export type MongoDocument = Record<string, unknown>;
export type MongoFilter = Record<string, unknown>;
export type MongoUpdate = Record<string, unknown>;
```

---

**2. `src/services/mongodb.ts` -- create or replace**

```ts
import { MongoClient } from 'mongodb';
import type { MongoConfig, MongoDocument, MongoFilter, MongoUpdate } from '../types/mongodb.js';

export function createMongoService(config?: MongoConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error("mongodb service is not configured -- call .mongodb(config) on the suite");
  };

  let client: MongoClient | null = null;

  const getClient = async (): Promise<MongoClient> => {
    ensureConfig();
    if (!client) {
      client = new MongoClient(config!.uri);
      await client.connect();
    }
    return client;
  };

  const getCollection = async (collection: string) => {
    const c = await getClient();
    return c.db(config!.database).collection(collection);
  };

  return {
    async insertOne(collection: string, doc: MongoDocument): Promise<{ insertedId: string }> {
      const col = await getCollection(collection);
      const result = await col.insertOne(doc);
      return { insertedId: result.insertedId.toString() };
    },

    async insertMany(collection: string, docs: MongoDocument[]): Promise<{ insertedCount: number; insertedIds: string[] }> {
      const col = await getCollection(collection);
      const result = await col.insertMany(docs);
      return {
        insertedCount: result.insertedCount,
        insertedIds: Object.values(result.insertedIds).map(id => id.toString()),
      };
    },

    async findOne<T = MongoDocument>(collection: string, filter: MongoFilter): Promise<T | null> {
      const col = await getCollection(collection);
      return col.findOne(filter) as Promise<T | null>;
    },

    async find<T = MongoDocument>(collection: string, filter: MongoFilter = {}): Promise<T[]> {
      const col = await getCollection(collection);
      return col.find(filter).toArray() as unknown as Promise<T[]>;
    },

    async updateOne(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.updateOne(filter, update);
      return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
    },

    async updateMany(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.updateMany(filter, update);
      return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
    },

    async deleteOne(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.deleteOne(filter);
      return { deletedCount: result.deletedCount };
    },

    async deleteMany(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.deleteMany(filter);
      return { deletedCount: result.deletedCount };
    },

    async disconnect(): Promise<void> {
      if (client) {
        await client.close();
        client = null;
      }
    },
  };
}
```

---

**3. `src/suite.ts` -- four additions**

Add two imports near the top of the file (before `// dtk:imports`):

```ts
import { createMongoService } from "./services/mongodb.js";
import type { MongoConfig } from "./types/mongodb.js";
```

Add a private field inside the `Suite` class (before `// dtk:configs`):

```ts
private mongodbConfig?: MongoConfig;
```

Add a builder method (before `// dtk:methods`):

```ts
mongodb(config: MongoConfig): this { this.mongodbConfig = config; return this; }
```

Add the service instance in `buildContext` inside the `services` block (before `// dtk:services`):

```ts
mongodb: createMongoService(this.mongodbConfig),
```

---

**4. `src/types/suite.ts` -- two additions**

Add a type import (before `// dtk:type-imports`):

```ts
import type { MongoDocument, MongoFilter, MongoUpdate } from "./mongodb.js";
```

Add the service shape to the `services` block inside `StepContext` (before `// dtk:service-types`):

```ts
mongodb: { insertOne(collection: string, doc: MongoDocument): Promise<{ insertedId: string }>; insertMany(collection: string, docs: MongoDocument[]): Promise<{ insertedCount: number; insertedIds: string[] }>; findOne<T = MongoDocument>(collection: string, filter: MongoFilter): Promise<T | null>; find<T = MongoDocument>(collection: string, filter?: MongoFilter): Promise<T[]>; updateOne(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }>; updateMany(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }>; deleteOne(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }>; deleteMany(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }>; disconnect(): Promise<void>; };
```

---

**5. `.env.template` -- append**

```
MONGODB_URI=
MONGODB_DATABASE=
```

---

**6. `package.json` -- add dependency and run `npm install`**

```json
"dependencies": {
  "mongodb": "^6.17.0"
}
```

```bash
npm install
```

---

## [1.4.0] - 2026-06-15

### Changed

- **open-ai plugin**: replaced the internal `httpGet`/`httpPost` HTTP wrapper with the official `openai` npm SDK. Auth header construction, URL building, and request/response types are now handled by the SDK.

#### Breaking changes

- `OpenAiConfig` now requires `apiKey: string` instead of `baseUrl: string`
- `listModels` no longer accepts a `bearerToken` argument
- `response` no longer accepts a `bearerToken` argument -- signature is now `(model, format, message)`

#### Upgrading the open-ai plugin

There is no automated upgrade. Make the following changes to your generated project in order.

---

**1. `package.json` -- add `openai` to the `dependencies` section (not `devDependencies`), then run `npm install`**

```json
"dependencies": {
  "openai": "^6.0.0"
}
```

---

**2. `src/types/open-ai.ts` -- replace the entire file**

```ts
export interface OpenAiConfig {
  apiKey: string;
}

export type OpenAiResponseFormat = "text" | "json_object";
```

---

**3. `src/services/open-ai.ts` -- replace the entire file**

```ts
import OpenAI from "openai";
import type { OpenAiConfig, OpenAiResponseFormat } from "../types/open-ai.js";

export function createOpenAIService(config?: OpenAiConfig) {
  const client = config ? new OpenAI({ apiKey: config.apiKey }) : null;

  const ensureClient = (): OpenAI => {
    if (!client) throw new Error("openAi service is not configured -- call .openAi(config) on the suite");
    return client;
  };

  return {
    listModels: async () => ensureClient().models.list(),
    response: async (model: string, format: OpenAiResponseFormat, message: string) =>
      ensureClient().responses.create({
        model,
        input: message,
        text: { format: { type: format } },
      }),
  };
}
```

---

**4. `src/services/open-ai.test.ts` -- replace the entire file**

```ts
import { createOpenAIService } from './open-ai.js';
import OpenAI from 'openai';

jest.mock('openai');

const MockOpenAI = jest.mocked(OpenAI);

describe('createOpenAIService', () => {
  const config = { apiKey: 'sk-test-token' };
  let mockList: jest.Mock;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockList = jest.fn();
    mockCreate = jest.fn();
    MockOpenAI.mockImplementation(() => ({
      models: { list: mockList },
      responses: { create: mockCreate },
    }) as unknown as OpenAI);
  });

  describe('listModels', () => {
    it('calls models.list', async () => {
      mockList.mockResolvedValue({ data: [] });
      const openAi = createOpenAIService(config);
      await openAi.listModels();
      expect(mockList).toHaveBeenCalled();
    });
  });

  describe('response', () => {
    it('calls responses.create with correct args', async () => {
      mockCreate.mockResolvedValue({ id: 'resp-1' });
      const openAi = createOpenAIService(config);
      await openAi.response('gpt-4o-mini', 'text', 'Say hello.');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        input: 'Say hello.',
        text: { format: { type: 'text' } },
      });
    });

    it('passes format in request body', async () => {
      mockCreate.mockResolvedValue({ id: 'resp-1' });
      const openAi = createOpenAIService(config);
      await openAi.response('gpt-4o-mini', 'json_object', 'Return JSON.');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ text: { format: { type: 'json_object' } } })
      );
    });
  });
});
```

---

**5. `src/types/suite.ts` -- three changes**

Update the `open-ai` type import on the line that reads:

```ts
import type { OpenAiConfig, OpenAiListModels, OpenAiResponse } from "./open-ai.js";
```

Remove `OpenAiListModels` and `OpenAiResponse`, and add SDK type imports directly below it:

```ts
import type { OpenAiConfig } from "./open-ai.js";
import type { Model } from "openai";
import type { Response as OpenAiApiResponse } from "openai/resources/responses/responses";
```

Update the `openAi` entry in the `services` block that reads:

```ts
openAi: { listModels(bearerToken: string): Promise<OpenAiListModels>; response(bearerToken: string, model: string, format: string, message: string): Promise<OpenAiResponse>; };
```

Replace with:

```ts
openAi: { listModels(): Promise<{ data: Model[] }>; response(model: string, format: string, message: string): Promise<OpenAiApiResponse>; };
```

---

**6. `src/runbooks/open-ai.ts` -- apply the following changes to each open-ai runbook**

If you have not customised the generated runbook you can replace the file outright using the content at the end of this section. If you have customised it, apply these three targeted changes instead.

**Change the config passed to `.openAi()`:**

```ts
// Before
.openAi({ baseUrl: "https://api.openai.com" })

// After
.openAi({ apiKey: process.env.OPENAI_API_KEY! })
```

**Remove bearer token construction and pass arguments directly to `listModels` and `response`:**

```ts
// Before
const token = `Bearer ${process.env.OPENAI_API_KEY!}`;
const result = await ctx.services.openAi.listModels(token);

// After
const result = await ctx.services.openAi.listModels();
```

```ts
// Before
const token = `Bearer ${process.env.OPENAI_API_KEY!}`;
const result = await ctx.services.openAi.response(token, "gpt-4o-mini", "text", "Say hello in one sentence.");

// After
const result = await ctx.services.openAi.response("gpt-4o-mini", "text", "Say hello in one sentence.");
```

If you have not customised the generated runbook, you can replace the entire file with:

```ts
import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .openAi({
    apiKey: process.env.OPENAI_API_KEY!,
  })
  .step("list-models", async (ctx) => {
    const result = await ctx.services.openAi.listModels();
    console.log(`Available models (${result.data.length}):`);
    result.data.slice(0, 5).forEach((m) => console.log(" -", m.id));
    return result;
  })
  .step("send-response", async (ctx) => {
    const result = await ctx.services.openAi.response(
      "gpt-4o-mini",
      "text",
      "Say hello in one sentence."
    );
    const firstOutput = result.output[0];
    const firstContent = firstOutput?.type === 'message' ? firstOutput.content[0] : undefined;
    const text = firstContent?.type === 'output_text' ? firstContent.text : undefined;
    console.log("response:", text);
    return result;
  })
  .run("throwOnError");
```

---

## [1.3.1] - 2026-06-14

### Security

- **tsx** bumped from `^4.0.0` to `^4.22.4` — resolves two HIGH severity esbuild vulnerabilities in the generated project's dev toolchain:
  - [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr)
  - [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)

### Dependencies updated in generated projects

The following versions are now written into newly generated `package.json` files:

| Package | 1.3.0 | 1.3.1 |
|---|---|---|
| `typescript` | `^5.0.0` | `^6.0.0` |
| `dotenv` | `^16.4.0` | `^17.0.0` |
| `redis` | `^4.7.1` | `^6.0.0` |
| `commander` | `^14.0.3` | `^15.0.0` |
| `@types/node` | `^20.0.0` | `^25.0.0` |
| `tsx` | `^4.0.0` | `^4.22.4` |
| `@aws-sdk/*` | `^3.1040-1041.0` | `^3.1068.0` |
| `axios` | `^1.6.0` | `^1.17.0` |
| `jest` | `^30.3.0` | `^30.4.2` |
| `ts-jest` | `^29.4.9` | `^29.4.11` |

### Upgrading an existing generated project

There is no automated upgrade. To adopt these changes manually:

1. Open your project's `package.json` and update the versions in the table above to match the 1.3.1 column.
2. Run `npm install` to update your lockfile.
3. Run your tests to confirm nothing broke: `npm test`.

All runbooks have been tested against these versions and pass cleanly. If you are working with the generated project largely as-is -- customising runbooks to suit your use case but keeping the overall structure -- you should have no issues. Breaking changes are only likely if you have significantly deviated from the generated structure or extended the services in ways that depend on internals of the bumped packages.

The `tsx` security fix is the most important update. If you do nothing else, update that one.
