# dtk

A CLI scaffolding tool for generating self-contained TypeScript runbook projects. Install dtk globally, scaffold a project, add service plugins, and write runbooks. Your generated project has no runtime dependency on dtk -- you own all the files.

---

## Table of Contents

1. [Installation](#installation)
2. [dtk init](#dtk-init)
3. [dtk add](#dtk-add)
4. [Available plugins](#available-plugins)
5. [Writing runbooks](#writing-runbooks)
6. [Writing a custom service](#writing-a-custom-service)
7. [Creating a new plugin](#creating-a-new-plugin)
8. [Generated project structure](#generated-project-structure)
9. [dtk source structure](#dtk-source-structure)

---

## Installation

```bash
npm install -g @jordanalec/dtk
```

**For contributors** — clone and link locally:

```bash
git clone <repo-url>
cd <repo>/dtk
npm install
npm run build
npm link
```

Verify it works:

```bash
dtk --help
```

To unlink:

```bash
npm unlink -g dtk
```

---

## dtk init

Scaffolds a new project in the current directory.

```bash
mkdir my-project
cd my-project
dtk init
npm install
```

Run the included example runbook to verify the setup:

```bash
npm run runbook:example
```

Expected output:

```
login: torvalds
name: Linus Torvalds
[OK] fetch-github-user
```

---

## dtk add

Adds a service plugin to your project. Run from inside your generated project directory.

```bash
dtk add <plugin>
```

Each plugin:
- Copies a service file into `src/services/`
- Copies a types file into `src/types/`
- Patches `src/suite.ts` to wire the service in (imports, config field, builder method, service instance)
- Patches `src/types/suite.ts` to add the service type shape to `StepContext`
- Appends required env vars to `.env.template`
- Creates an example runbook at `src/runbooks/<plugin>.ts`
- Adds a `runbook:<plugin>` script to `package.json`
- Runs `npm install` for any required dependencies automatically

Running `dtk add` on a plugin that has already been added is safe -- files and patches are not duplicated.

---

## Available plugins

### aws-sqs

Sends messages to an AWS SQS queue.

```bash
dtk add aws-sqs
```

Env vars appended to `.env.template`:

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
    const result = await ctx.services.sqs.sendMessage("hello world", {
      source: "my-runbook",
    });
    console.log("messageId:", result.messageId);
    return result;
  })
  .run(SuiteRunOption.ThrowOnError);
```

AWS credentials are resolved from the environment via the SDK default provider chain (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

---

### aws-sns

Publishes messages to an AWS SNS topic.

```bash
dtk add aws-sns
```

Env vars appended to `.env.template`:

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
    const result = await ctx.services.sns.publish(
      "hello world",
      "optional subject",
      { source: "my-runbook" }
    );
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

Env vars appended to `.env.template`:

```
OPENAI_API_KEY=
```

Usage:

```ts
await suite()
  .openAi({ baseUrl: "https://api.openai.com" })
  .step("list-models", async (ctx) => {
    const token = `Bearer ${process.env.OPENAI_API_KEY!}`;
    return ctx.services.openAi.listModels(token);
  })
  .step("send-response", async (ctx) => {
    const token = `Bearer ${process.env.OPENAI_API_KEY!}`;
    return ctx.services.openAi.response(token, "gpt-4o-mini", "text", "Say hello.");
  })
  .run(SuiteRunOption.ThrowOnError);
```

---

## Writing runbooks

A runbook is a TypeScript file that uses the `suite()` builder to chain steps and run them in sequence.

```ts
import "../load-env.js";
import { suite, SuiteRunOption } from "../suite.js";

await suite()
  .step("step-one", async (ctx) => {
    const data = await ctx.http.get<{ id: number }>("https://api.example.com/thing/1");
    console.log("id:", data.id);
    return data;
  })
  .step("step-two", async (ctx) => {
    const prev = ctx.outputs["step-one"] as { id: number };
    console.log("previous id:", prev.id);
  })
  .run(SuiteRunOption.ThrowOnError);
```

Add a script to `package.json` to run it:

```json
"runbook:my-runbook": "tsx src/runbooks/my-runbook.ts"
```

```bash
npm run runbook:my-runbook
```

### Run options

| Option | Behaviour |
|---|---|
| `SuiteRunOption.ThrowOnError` | Stops on first failure and throws |
| `SuiteRunOption.ContinueOnError` | Logs the failure and moves to the next step |

### Step context

Every step receives `ctx`:

| Property | Description |
|---|---|
| `ctx.outputs` | Return values from all previous steps, keyed by step name |
| `ctx.auth` | Auth helpers: `clientCredentials`, `basicAuth`, `bearerToken`, `getClaimValues` |
| `ctx.http` | Generic HTTP client: `get`, `post` |
| `ctx.services` | All wired service instances (populated by plugins or custom services) |

### Auth

**OAuth client credentials:**

```ts
.oauth({
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  tokenUrl: process.env.TOKEN_URL!,
  scope: "openid",
})
.step("fetch", async (ctx) => {
  const token = await ctx.auth.clientCredentials();
  return ctx.http.get("https://api.example.com/data", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
})
```

**Basic auth:**

```ts
.basicAuth({ username: process.env.USER!, password: process.env.PASS! })
.step("fetch", async (ctx) => {
  const header = await ctx.auth.basicAuth();
  return ctx.http.get("https://api.example.com/data", {
    headers: { Authorization: header },
  });
})
```

**Bearer token:**

```ts
.bearerToken({ token: process.env.API_TOKEN!, prefix: "Bearer" })
.step("fetch", async (ctx) => {
  const header = await ctx.auth.bearerToken();
  return ctx.http.get("https://api.example.com/data", {
    headers: { Authorization: header },
  });
})
```

**JWT claim extraction:**

```ts
const claims = ctx.auth.getClaimValues(token.access_token);
```

### Passing data between steps

Each step's return value is stored in `ctx.outputs` under the step name:

```ts
.step("get-user", async (ctx) => {
  return ctx.http.get<User>("https://api.example.com/user/1");
})
.step("use-user", async (ctx) => {
  const user = ctx.outputs["get-user"] as User;
  console.log(user.name);
})
```

---

## Writing a custom service

If there is no plugin for the service you need, wire one in manually across four files.

### 1. Create `src/services/my-service.ts`

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

### 2. Add the type to `src/types/suite.ts`

Add your config interface and the service shape to `StepContext`, using the existing sentinel comments as your guide for placement:

```ts
export interface MyServiceConfig { baseUrl: string; }

// inside StepContext.services:
services: {
  myService: {
    getItem(id: number): Promise<{ id: number; name: string }>;
    createItem(name: string): Promise<{ id: number }>;
  };
  // dtk:service-types  <-- keep this, leave it in place
};
```

### 3. Wire into `src/suite.ts`

Add the import near the top (before `// dtk:imports`):

```ts
import { createMyService } from "./services/my-service.js";
import type { MyServiceConfig } from "./services/my-service.js";
```

Add a private field inside the class (before `// dtk:configs`):

```ts
private myServiceConfig?: MyServiceConfig;
```

Add a builder method (before `// dtk:methods`):

```ts
myService(config: MyServiceConfig): this { this.myServiceConfig = config; return this; }
```

Add the service instance in `buildContext` (before `// dtk:services`):

```ts
myService: createMyService(this.myServiceConfig),
```

### 4. Use it in a runbook

```ts
await suite()
  .myService({ baseUrl: "https://api.example.com" })
  .step("get-item", async (ctx) => {
    return ctx.services.myService.getItem(1);
  })
  .run(SuiteRunOption.ThrowOnError);
```

---

## Creating a new plugin

A plugin is a directory inside `templates/plugins/` containing a manifest, service file, types file, env file, and example runbook. Once created, `dtk add <plugin>` handles everything else automatically.

### 1. Create the plugin directory

```
templates/plugins/my-plugin/
  plugin.json
  service.ts
  types.ts
  env.txt
  example.ts
```

### 2. Define types in `types.ts`

```ts
export interface MyPluginConfig {
  baseUrl: string;
}

export interface MyPluginResult {
  id: string;
  status: string;
}
```

### 3. Implement the service in `service.ts`

Import from the generated project's paths (e.g. `../lib/http.js`, `../types/my-plugin.js`):

```ts
import { httpGet, httpPost } from "../lib/http.js";
import type { MyPluginConfig, MyPluginResult } from "../types/my-plugin.js";

export function createMyPluginService(config?: MyPluginConfig) {
  return {
    doThing: async (payload: string): Promise<MyPluginResult> => {
      return httpPost(`${config!.baseUrl}/things`, { payload });
    },
  };
}
```

### 4. List env vars in `env.txt`

One variable per line, no values:

```
MY_PLUGIN_BASE_URL=
MY_PLUGIN_API_KEY=
```

### 5. Write an example runbook in `example.ts`

The example is copied to `src/runbooks/<plugin>.ts` in the user's project. Imports are relative to `src/runbooks/`:

```ts
import "../load-env.js";
import { suite, SuiteRunOption } from "../suite.js";

await suite()
  .myPlugin({
    baseUrl: process.env.MY_PLUGIN_BASE_URL!,
  })
  .step("do-thing", async (ctx) => {
    const result = await ctx.services.myPlugin.doThing("hello");
    console.log("result:", result.status);
    return result;
  })
  .run(SuiteRunOption.ThrowOnError);
```

### 6. Write `plugin.json`

The manifest drives everything `dtk add` does. The `patches` keys must exactly match the sentinel comment names in the generated `suite.ts` and `types/suite.ts`.

```json
{
  "name": "my-plugin",
  "description": "My plugin -- does a thing",
  "dependencies": {
    "some-sdk": "^1.0.0"
  },
  "files": [
    { "src": "service.ts", "dest": "src/services/my-plugin.ts" },
    { "src": "types.ts",   "dest": "src/types/my-plugin.ts" }
  ],
  "env": "env.txt",
  "example": "example.ts",
  "patches": {
    "src/suite.ts": {
      "imports": [
        "import { createMyPluginService } from \"./services/my-plugin.js\";",
        "import type { MyPluginConfig } from \"./types/my-plugin.js\";"
      ],
      "configs":  "  private myPluginConfig?: MyPluginConfig;",
      "methods":  "  myPlugin(config: MyPluginConfig): this { this.myPluginConfig = config; return this; }",
      "services": "        myPlugin: createMyPluginService(this.myPluginConfig),"
    },
    "src/types/suite.ts": {
      "type-imports":  "import type { MyPluginConfig, MyPluginResult } from \"./my-plugin.js\";",
      "service-types": "    myPlugin: { doThing(payload: string): Promise<MyPluginResult>; };"
    }
  }
}
```

### 7. Register the plugin in `cli/add.ts`

Add your plugin key to `PLUGIN_MAP`:

```ts
const PLUGIN_MAP: Record<string, string> = {
  'aws-sqs':   'aws-sqs',
  'aws-sns':   'aws-sns',
  'open-ai':   'open-ai',
  'my-plugin': 'my-plugin',  // add this
};
```

### 8. Rebuild dtk

```bash
npm run build
```

`dtk add my-plugin` is now available.

### Sentinel reference

The `patches` keys in `plugin.json` correspond to these comments in the generated project:

| Sentinel | File | What gets injected |
|---|---|---|
| `imports` | `src/suite.ts` | Service and type imports |
| `configs` | `src/suite.ts` | Private config field on the class |
| `methods` | `src/suite.ts` | Builder method (e.g. `.myPlugin(config)`) |
| `services` | `src/suite.ts` | Service instance in `buildContext` |
| `type-imports` | `src/types/suite.ts` | Plugin type imports |
| `service-types` | `src/types/suite.ts` | Service shape on `StepContext.services` |

Each sentinel value can be a single string or an array of strings. Arrays inject multiple lines before the same sentinel, in order. Injection is idempotent -- if a line is already present it is not duplicated.

---

## Generated project structure

This is the structure inside a project created by `dtk init` after running `dtk add aws-sqs`:

```
my-project/
  src/
    suite.ts              # TestSuite builder and runner -- do not delete sentinel comments
    load-env.ts           # dotenv bootstrap -- import this first in every runbook
    lib/
      http.ts             # httpGet / httpPost / httpDelete (axios wrapper)
      oauth.ts            # client credentials OAuth flow
      basic-auth.ts       # base64 Basic auth header builder
      bearer-token.ts     # Bearer token header builder
      token.ts            # JWT claim decoder
    types/
      suite.ts            # StepContext, SuiteRunOption, auth types -- do not delete sentinel comments
      oauth.ts            # OAuthConfig, TokenResponse
      aws-sqs.ts          # SqsConfig, SendMessageResult (added by plugin)
    services/
      sqs.ts              # SQS service factory (added by plugin)
    runbooks/
      example.ts          # starter runbook (GitHub API)
      aws-sqs.ts          # example runbook (added by plugin)
  .env.template           # env var list -- copy to .env and fill in values
  tsconfig.json
  package.json
```

---

## dtk source structure

This section is for contributors and plugin authors working inside the dtk repo itself.

```
cli/
  cli.ts                  # entry point -- registers init and add commands
  init.ts                 # dtk init handler -- copies templates/init/src + root config files
  add.ts                  # dtk add handler -- reads plugin.json, copies files, patches, installs
  utils/
    patch.ts              # sentinel injection utility (injectAtSentinel)
templates/
  init/                   # scaffold copied by dtk init
    src/                  # the TypeScript source that lands in the user's src/
      suite.ts
      load-env.ts
      lib/
      types/
      runbooks/
    .env.template
    tsconfig.json
    package.json
  plugins/                # one directory per plugin
    aws-sqs/
      plugin.json         # manifest: files, patches, env, example, dependencies
      service.ts          # service factory (copied to src/services/)
      types.ts            # types (copied to src/types/)
      env.txt             # env var fragment (appended to .env.template)
      example.ts          # example runbook (copied to src/runbooks/)
    aws-sns/
    open-ai/
```
