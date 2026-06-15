# Changelog

All notable changes to dtk are documented here, starting from 1.3.1.

Since dtk generates files that you own, there is no automatic upgrade path. Each release notes what changed and which files to update manually if you want to adopt the changes.

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
