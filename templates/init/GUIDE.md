# Project Guide

Everything you need to know about working with this project, extending it, and adding new services.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Environment variables](#environment-variables)
3. [Writing a runbook](#writing-a-runbook)
4. [Auth patterns](#auth-patterns)
5. [Passing data between steps](#passing-data-between-steps)
6. [Adding a plugin](#adding-a-plugin)
7. [Available plugins](#available-plugins)
8. [Writing a custom service](#writing-a-custom-service)
9. [File reference](#file-reference)

---

## How it works

Each runbook creates a suite, configures auth and services via builder methods, chains steps, then calls `.run()`.

Steps execute in sequence. Each step receives a shared context (`ctx`) containing auth helpers, an HTTP client, and any wired service instances. The return value of each step is stored in `ctx.outputs` and available to all subsequent steps.

```ts
import "../load-env.js";
import { suite, SuiteRunOption } from "../suite.js";

await suite()
  .oauth({ clientId, clientSecret, tokenUrl })
  .step("get-token", async (ctx) => {
    return ctx.auth.clientCredentials();
  })
  .step("use-token", async (ctx) => {
    const token = ctx.outputs["get-token"] as { access_token: string };
    return ctx.http.get("https://api.example.com/data", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
  })
  .run(SuiteRunOption.ThrowOnError);
```

### Run options

| Option | Behaviour |
|---|---|
| `SuiteRunOption.ThrowOnError` | Stops on first failure and throws |
| `SuiteRunOption.ContinueOnError` | Logs the failure and moves to the next step |

---

## Environment variables

Copy `.env.template` to `.env` and fill in values. `.env.local` overrides `.env` if present. Neither file should be committed -- both are in `.gitignore`.

```bash
cp .env.template .env
```

`load-env.ts` handles loading. Import it as the first line of every runbook:

```ts
import "../load-env.js";
```

---

## Writing a runbook

Create a `.ts` file in `src/runbooks/`. Import `load-env.js` first, then import `suite` and `SuiteRunOption` from `suite.js`.

```ts
import "../load-env.js";
import { suite, SuiteRunOption } from "../suite.js";

await suite()
  .step("fetch", async (ctx) => {
    const data = await ctx.http.get<{ name: string }>("https://api.example.com/thing/1");
    console.log(data.name);
    return data;
  })
  .run(SuiteRunOption.ThrowOnError);
```

Add a script to `package.json` so you can run it with `npm run`:

```json
"runbook:my-workflow": "tsx src/runbooks/my-workflow.ts"
```

Or run it directly:

```bash
npx tsx src/runbooks/my-workflow.ts
```

---

## Auth patterns

### OAuth client credentials

```ts
await suite()
  .oauth({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    tokenUrl: process.env.TOKEN_URL!,
    scope: "openid",             // optional
  })
  .step("fetch", async (ctx) => {
    const token = await ctx.auth.clientCredentials();
    return ctx.http.get("https://api.example.com/data", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
  })
  .run(SuiteRunOption.ThrowOnError);
```

### Basic auth

```ts
await suite()
  .basicAuth({
    username: process.env.API_USER!,
    password: process.env.API_PASS!,
  })
  .step("fetch", async (ctx) => {
    const header = await ctx.auth.basicAuth();
    return ctx.http.get("https://api.example.com/data", {
      headers: { Authorization: header },
    });
  })
  .run(SuiteRunOption.ThrowOnError);
```

### Bearer token

```ts
await suite()
  .bearerToken({
    token: process.env.API_TOKEN!,
    prefix: "Bearer",
  })
  .step("fetch", async (ctx) => {
    const header = await ctx.auth.bearerToken();
    return ctx.http.get("https://api.example.com/data", {
      headers: { Authorization: header },
    });
  })
  .run(SuiteRunOption.ThrowOnError);
```

### JWT claim extraction

```ts
const claims = ctx.auth.getClaimValues(token.access_token);
console.log(claims.sub);
```

---

## Passing data between steps

Every step's return value is stored in `ctx.outputs` under the step name. Cast to the type you expect:

```ts
await suite()
  .step("get-user", async (ctx) => {
    return ctx.http.get<{ id: number; name: string }>("https://api.example.com/user/1");
  })
  .step("get-orders", async (ctx) => {
    const user = ctx.outputs["get-user"] as { id: number; name: string };
    return ctx.http.get(`https://api.example.com/orders?userId=${user.id}`);
  })
  .run(SuiteRunOption.ThrowOnError);
```

---

## Adding a plugin

Requires the dtk CLI to be installed globally. From this project directory:

```bash
dtk add <plugin>
```

This will automatically:
- Copy the service and types files into `src/`
- Patch `src/suite.ts` to wire the service in
- Patch `src/types/suite.ts` to add the service types to the step context
- Append the required env vars to `.env.template`
- Create an example runbook in `src/runbooks/`
- Add a `runbook:<plugin>` script to `package.json`
- Run `npm install` for any required dependencies

Running `dtk add` on an already-added plugin is safe -- nothing is duplicated.

---

## Available plugins

### aws-sqs

Sends messages to an AWS SQS queue.

```bash
dtk add aws-sqs
```

Required env vars:

```
SQS_QUEUE_URL=
AWS_REGION=
```

Usage:

```ts
await suite()
  .sqs({
    queueUrl: process.env.SQS_QUEUE_URL!,
    region: process.env.AWS_REGION!,
  })
  .step("send", async (ctx) => {
    const result = await ctx.services.sqs.sendMessage("hello world");
    console.log("messageId:", result.messageId);
    return result;
  })
  .run(SuiteRunOption.ThrowOnError);
```

AWS credentials are picked up automatically from `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your environment.

---

### aws-sns

Publishes messages to an AWS SNS topic.

```bash
dtk add aws-sns
```

Required env vars:

```
SNS_TOPIC_ARN=
AWS_REGION=
```

Usage:

```ts
await suite()
  .sns({
    topicArn: process.env.SNS_TOPIC_ARN!,
    region: process.env.AWS_REGION!,
  })
  .step("publish", async (ctx) => {
    const result = await ctx.services.sns.publish("hello world", "optional subject");
    console.log("messageId:", result.messageId);
    return result;
  })
  .run(SuiteRunOption.ThrowOnError);
```

---

### open-ai

Lists models and sends responses via the OpenAI API.

```bash
dtk add open-ai
```

Required env vars:

```
OPENAI_API_KEY=
```

Usage:

```ts
await suite()
  .openAi({ baseUrl: "https://api.openai.com" })
  .step("respond", async (ctx) => {
    const token = `Bearer ${process.env.OPENAI_API_KEY!}`;
    return ctx.services.openAi.response(token, "gpt-4o-mini", "text", "Say hello.");
  })
  .run(SuiteRunOption.ThrowOnError);
```

---

## Writing a custom service

If there is no plugin for the service you need, wire one in manually. Four files are involved.

### 1. Create the service factory

`src/services/my-service.ts`:

```ts
import { httpGet, httpPost } from "../lib/http.js";

export interface MyServiceConfig {
  baseUrl: string;
}

export function createMyService(config?: MyServiceConfig) {
  return {
    getItem: async (id: number): Promise<{ id: number; name: string }> => {
      return httpGet(`${config!.baseUrl}/items/${id}`);
    },
    createItem: async (name: string): Promise<{ id: number }> => {
      return httpPost(`${config!.baseUrl}/items`, { name });
    },
  };
}
```

### 2. Add the type shape to `src/types/suite.ts`

Add your config type and service shape. Place them above the `// dtk:service-types` sentinel:

```ts
export interface MyServiceConfig { baseUrl: string; }

// inside StepContext.services:
services: {
  myService: {
    getItem(id: number): Promise<{ id: number; name: string }>;
    createItem(name: string): Promise<{ id: number }>;
  };
  // dtk:service-types  <-- do not remove this line
};
```

### 3. Wire the service into `src/suite.ts`

Add the import before `// dtk:imports`:

```ts
import { createMyService } from "./services/my-service.js";
import type { MyServiceConfig } from "./services/my-service.js";
```

Add a private field before `// dtk:configs`:

```ts
private myServiceConfig?: MyServiceConfig;
```

Add a builder method before `// dtk:methods`:

```ts
myService(config: MyServiceConfig): this { this.myServiceConfig = config; return this; }
```

Add the service instance before `// dtk:services`:

```ts
myService: createMyService(this.myServiceConfig),
```

### 4. Use it in a runbook

```ts
await suite()
  .myService({ baseUrl: process.env.MY_SERVICE_BASE_URL! })
  .step("get-item", async (ctx) => {
    const item = await ctx.services.myService.getItem(1);
    console.log(item.name);
    return item;
  })
  .run(SuiteRunOption.ThrowOnError);
```

---

## File reference

### `src/suite.ts`

The core of the project. The `TestSuite` class holds service configs, collects steps, builds the step context, and runs steps in sequence. The sentinel comments (`// dtk:imports`, `// dtk:configs`, `// dtk:methods`, `// dtk:services`) are injection points used by `dtk add` -- do not remove them.

### `src/types/suite.ts`

All shared type definitions: `StepContext`, `StepFn`, `Step`, `SuiteRunOption`, and auth config types. The sentinels (`// dtk:type-imports`, `// dtk:service-types`) are also injection points -- do not remove them.

### `src/types/oauth.ts`

`OAuthConfig` and `TokenResponse` -- the input and output types for the OAuth client credentials flow.

### `src/lib/http.ts`

Axios wrapper. Provides `httpGet`, `httpPost`, and `httpDelete`. Normalises errors into plain `Error` objects with readable messages. Use this inside service factories instead of calling axios directly.

### `src/lib/oauth.ts`

Implements the OAuth 2.0 client credentials flow. Posts to the token URL with `application/x-www-form-urlencoded` and returns a `TokenResponse`.

### `src/lib/basic-auth.ts`

Base64-encodes `username:password` and returns a `Basic <token>` string ready to use as an `Authorization` header.

### `src/lib/bearer-token.ts`

Returns `<prefix> <token>` (e.g. `Bearer sk-abc123`) ready to use as an `Authorization` header.

### `src/lib/token.ts`

`getClaimValues(token)` decodes the payload of a JWT and returns the claims as a plain object. Does not verify the signature.

### `src/load-env.ts`

Loads `.env` then `.env.local` (local overrides). Import this as the very first line of every runbook.

### `.env.template`

Lists all environment variables the project needs. Copy to `.env` and fill in real values. Never commit `.env`.

### `tsconfig.json`

TypeScript config. `module: NodeNext` means all imports must use `.js` extensions even though the source files are `.ts`. `strict: true` is enabled.
