# My dtk Project

A TypeScript runbook project for orchestrating multi-step API workflows. Uses a fluent builder API to chain authentication, HTTP calls, and service interactions into readable, repeatable scripts.

---

## Quick Start

```bash
npm install
cp .env.template .env
# fill in .env with your credentials
npm run runbook:example
```

---

## Running Runbooks

```bash
npm run runbook:example    # unauthenticated HTTP call (GitHub API)
```

Add your own runbook scripts to `package.json` as you create them:

```json
"runbook:my-workflow": "tsx src/runbooks/my-workflow.ts"
```

---

## Adding a Plugin

Install the dtk CLI if you haven't already, then run from this directory:

```bash
dtk add <plugin>
```

Available plugins: `aws-sqs`, `aws-sns`, `aws-dynamo`, `open-ai`

Each plugin adds a service, wires it into the suite, appends env vars to `.env.template`, creates an example runbook, and installs dependencies automatically.

See `GUIDE.md` for full details.

---

## Project Structure

```
src/
  suite.ts          # core runner -- extend this with custom services
  load-env.ts       # dotenv bootstrap -- import first in every runbook
  lib/              # HTTP client, OAuth, auth helpers
  types/            # type definitions
  services/         # service factories added by plugins or custom code
  runbooks/         # your runbook scripts
.env.template       # list of required env vars -- copy to .env
```
