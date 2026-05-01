# dtk

Developer Tool Kit: declarative TypeScript runbooks for orchestrating multi-step API workflows.

Provides a fluent builder API to chain OAuth authentication, HTTP calls, and service interactions into readable, reusable test workflows.

---

## Quick Start

```bash
npm install
cp .env.template .env.local   # fill in your credentials
npm run runbook:oauth-only
```

---

## Environment Setup

Copy `.env.template` to `.env.local` and populate values. `.env.local` is gitignored and overrides `.env`.

```env
# OAuth
CLIENT_ID=''
CLIENT_SECRET=''
TOKEN_URL=''
SCOPE=''

# Xero
XERO_BASE_URL=''

# WooCommerce
WOO_BASE_URL=''
WOO_CONSUMER_KEY=''
WOO_CONSUMER_SECRET=''

# OpenAI
OPENAI_BASE_URL=''
OPENAI_API_KEY=''

# AWS
AWS_REGION=''
AWS_ACCESS_KEY_ID=''
AWS_SECRET_ACCESS_KEY=''
SQS_QUEUE_URL=''
SNS_TOPIC_ARN=''
```

The AWS SDK picks up `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` from the environment automatically.

---

## Running Runbooks

```bash
npm run runbook:oauth-only              # OAuth token retrieval only
npm run runbook:xero-items              # token -> Xero all items
npm run runbook:xero-item               # token -> Xero item by code
npm run runbook:xero-delete-item        # token -> delete Xero item by code
npm run runbook:woo-items               # basic auth -> WooCommerce product list
npm run runbook:woo-item                # basic auth -> WooCommerce product by SKU
npm run runbook:open-ai-list-models     # bearer token -> OpenAI list models
npm run runbook:open-ai-chat-response   # bearer token -> OpenAI chat response
npm run runbook:sqs                     # send a message to SQS
npm run runbook:sns                     # publish a message to SNS
npm run runbook:generic-http            # unauthenticated HTTP call (GitHub example)
```

---

## How It Works

### Fluent Builder

Each runbook creates a suite, chains service config and steps, then calls `.run()`:

```typescript
await suite()
  .oauth({ clientId, clientSecret, tokenUrl, scope })
  .xero({ baseUrl })
  .step("get-token", async (ctx) => ctx.auth.clientCredentials())
  .step("get-item", async (ctx) => {
    const token = ctx.outputs["get-token"] as TokenResponse;
    return ctx.services.xero.getItemByCode("ITEM-001", token.access_token);
  })
  .run(SuiteRunOption.ThrowOnError);
```

- Config methods (`.oauth()`, `.basicAuth()`, `.bearerToken()`, `.xero()`, `.woo()`, `.openAi()`, `.sqs()`, `.sns()`) can be called in any order
- Steps execute sequentially in the order they are defined
- `.run(SuiteRunOption)` is the single entry point -- pass `ThrowOnError` to halt and throw on failure, or `ContinueOnError` to log and continue

### Shared Step Context

Every step receives `ctx: StepContext`:

```typescript
ctx.outputs     // results from all prior steps, keyed by step name
ctx.auth        // auth utilities: clientCredentials, basicAuth, bearerToken, getClaimValues
ctx.http        // generic HTTP client
ctx.services    // registered service instances (xero, woo, openAi, sqs, sns)
```

Outputs from prior steps are accessed by name:

```typescript
const token = ctx.outputs["get-token"] as TokenResponse;
```

### Step Execution

Each step returns a value that is stored in `ctx.outputs` under its name. If a step throws, the suite logs `[FAIL] step-name: <message>` and halts.

---

## Services

### OAuth (`ctx.auth.clientCredentials`)

Client credentials flow over `application/x-www-form-urlencoded`.

```typescript
const token = await ctx.auth.clientCredentials();
// or override config per-call:
const token = await ctx.auth.clientCredentials({ clientId, clientSecret, tokenUrl });
```

JWT claim extraction:

```typescript
const claims = ctx.auth.getClaimValues(token.access_token);
```

Configure with `.oauth()`:

```typescript
.oauth({
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  tokenUrl: process.env.TOKEN_URL!,
  scope: process.env.SCOPE,
})
```

---

### Basic Auth (`ctx.auth.basicAuth`)

Encodes `username:password` as a Base64 `Basic` header string.

```typescript
const header = await ctx.auth.basicAuth();
// use directly as an Authorization header value
```

Configure with `.basicAuth()`:

```typescript
.basicAuth({
  username: process.env.WOO_CONSUMER_KEY!,
  password: process.env.WOO_CONSUMER_SECRET!,
})
```

---

### Bearer Token (`ctx.auth.bearerToken`)

Constructs a bearer-style `Authorization` header string from a static token and a prefix.

```typescript
const header = await ctx.auth.bearerToken();
// returns "<prefix> <token>", e.g. "Bearer sk-abc123"
```

Configure with `.bearerToken()`:

```typescript
.bearerToken({
  token: process.env.OPENAI_API_KEY!,
  prefix: 'Bearer',
})
```

---

### Generic HTTP (`ctx.http`)

Make any HTTP call without registering a service:

```typescript
interface MyResponse { id: string; name: string; }

const data = await ctx.http.get<MyResponse>("https://api.example.com/resource", {
  headers: { Authorization: `Bearer ${token}` },
});

const result = await ctx.http.post<RequestBody, MyResponse>(
  "https://api.example.com/resource",
  { key: "value" },
  { headers: { "Content-Type": "application/json" } }
);
```

No builder method needed -- `ctx.http` is always available on every step.

---

### Xero (`ctx.services.xero`)

```typescript
const items = await ctx.services.xero.getItems(token.access_token);
const item = await ctx.services.xero.getItemByCode("ITEM-CODE", token.access_token);
const status = await ctx.services.xero.deleteItem("ITEM-ID", token.access_token);
```

Configure with `.xero()`:

```typescript
.xero({ baseUrl: process.env.XERO_BASE_URL! })
```

---

### WooCommerce (`ctx.services.woo`)

Uses Basic Auth. Pass the encoded header string from `ctx.auth.basicAuth()` to each call.

```typescript
const products = await ctx.services.woo.getProducts(10, 1, basicAuthHeader);
const product = await ctx.services.woo.getProductByCode("SKU-001", basicAuthHeader);
```

Configure with `.woo()`:

```typescript
.woo({ baseUrl: process.env.WOO_BASE_URL! })
```

---

### OpenAI (`ctx.services.openAi`)

Uses Bearer Token auth. Pass the bearer header string from `ctx.auth.bearerToken()` to each call.

```typescript
const models = await ctx.services.openAi.listModels(bearerToken);
const response = await ctx.services.openAi.response(bearerToken, "gpt-4.1-nano", "json_object", "Hi JSON!");
```

Configure with `.openAi()`:

```typescript
.openAi({ baseUrl: process.env.OPENAI_BASE_URL! })
```

---

### SQS (`ctx.services.sqs`)

```typescript
const result = await ctx.services.sqs.sendMessage(
  JSON.stringify({ event: "order-placed", orderId: "123" }),
  { source: "dtk" }   // optional message attributes
);
console.log(result.messageId);
```

Configure with `.sqs()`:

```typescript
.sqs({
  queueUrl: process.env.SQS_QUEUE_URL!,
  region: process.env.AWS_REGION!,
})
```

Credentials are resolved from the environment via the AWS SDK default credential provider chain.

---

### SNS (`ctx.services.sns`)

```typescript
const result = await ctx.services.sns.publish(
  JSON.stringify({ event: "user-signup" }),
  "Optional subject",     // optional, useful for email subscriptions
  { source: "dtk" }       // optional message attributes
);
console.log(result.messageId);
```

Configure with `.sns()`:

```typescript
.sns({
  topicArn: process.env.SNS_TOPIC_ARN!,
  region: process.env.AWS_REGION!,
})
```

---

## Adding a New Service

**1. Define types** in `src/types/<service>.ts`:

```typescript
export interface MyServiceConfig { baseUrl: string; }
export interface MyResource { id: string; name: string; }
```

**2. Export from the barrel** in `src/types.ts`:

```typescript
export * from "./types/my-service.js";
```

**3. Implement the service factory** in `src/services/<service>.ts`:

```typescript
export function createMyService(config?: MyServiceConfig) {
  return {
    getResource: async (id: string, bearerToken?: string): Promise<MyResource> => {
      const headers: Record<string, string> = bearerToken
        ? { Authorization: `Bearer ${bearerToken}` }
        : {};
      return httpGet<MyResource>(`${config!.baseUrl}/resources/${id}`, { headers });
    },
  };
}
```

**4. Add the builder method** to `src/suite.ts`:

```typescript
private myServiceConfig?: MyServiceConfig;

myService(config: MyServiceConfig): this {
  this.myServiceConfig = config;
  return this;
}
```

**5. Wire into `buildContext`** in `src/suite.ts`:

```typescript
services: {
  myService: createMyService(this.myServiceConfig),
}
```

**6. Add to `StepContext`** in `src/types/suite.ts`:

```typescript
services: {
  myService: {
    getResource(id: string, bearerToken?: string): Promise<MyResource>;
  };
}
```

**7. Add a runbook script** in `package.json`:

```json
"runbook:my-workflow": "tsx src/runbooks/my-workflow.ts"
```

---

## Project Structure

```
src/
  index.ts              # public entry point
  suite.ts              # TestSuite fluent builder and runner
  types.ts              # barrel re-export for all types
  lib/
    http.ts             # httpGet / httpPost (axios wrapper)
    oauth.ts            # client credentials OAuth flow
    basic-auth.ts       # basic auth header builder
    bearer-token.ts     # bearer token header builder
    token.ts            # JWT claim extraction
  types/
    oauth.ts            # OAuthConfig, TokenResponse
    basic-auth.ts       # BasicAuthConfig
    bearer-token.ts     # BearerTokenConfig
    aws.ts              # SqsConfig, SnsConfig, result types
    xero.ts             # XeroConfig, XeroItem
    woo-commerce.ts     # WooCommerceConfig, WooCommerceProduct
    open-ai.ts          # OpenAiConfig, OpenAiListModels, OpenAiResponse
    suite.ts            # StepContext, StepFn, Step, SuiteRunOption
  services/
    xero.ts             # Xero service factory
    woo-commerce.ts     # WooCommerce service factory
    open-ai.ts          # OpenAI service factory
    sqs.ts              # SQS service factory
    sns.ts              # SNS service factory
  runbooks/
    load-env.ts         # dotenv loader (.env -> .env.local override)
    oauth-only.ts
    generic-http.ts
    sqs.ts
    sns.ts
    xero/
      get-items.ts
      get-item-by-code.ts
      delete-item-by-code.ts
    woo/
      get-items.ts
      get-item-by-code.ts
    open-ai/
      list-models.ts
      chat-response.ts
```
