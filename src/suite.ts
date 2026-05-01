import { clientCredentials } from "./lib/oauth.js";
import { getClaimValues } from "./lib/token.js";
import { httpGet, httpPost } from "./lib/http.js";
import { createXeroService } from "./services/xero.js";
import { createSqsService } from "./services/sqs.js";
import { createSnsService } from "./services/sns.js";
import type { OAuthConfig, XeroConfig, SqsConfig, SnsConfig, Step, StepContext, StepFn } from "./types.js";

class TestSuite {
  private steps: Step[] = [];
  private oauthConfig?: OAuthConfig;
  private xeroConfig?: XeroConfig;
  private sqsConfig?: SqsConfig;
  private snsConfig?: SnsConfig;

  oauth(config: OAuthConfig): this {
    this.oauthConfig = config;
    return this;
  }

  xero(config: XeroConfig): this {
    this.xeroConfig = config;
    return this;
  }

  sqs(config: SqsConfig): this {
    this.sqsConfig = config;
    return this;
  }

  sns(config: SnsConfig): this {
    this.snsConfig = config;
    return this;
  }

  step(name: string, fn: StepFn): this {
    this.steps.push({ name, fn });
    return this;
  }

  private buildContext(outputs: Record<string, unknown>): StepContext {
    const oauthConfig = this.oauthConfig;
    return {
      outputs,
      auth: {
        clientCredentials: (config?) => clientCredentials(config ?? oauthConfig!),
        getClaimValues: getClaimValues,
      },
      http: {
        get: httpGet,
        post: httpPost,
      },
      services: {
        xero: createXeroService(this.xeroConfig),
        sqs: createSqsService(this.sqsConfig),
        sns: createSnsService(this.snsConfig),
      },
    };
  }

  async run(): Promise<void> {
    const outputs: Record<string, unknown> = {};
    const ctx = this.buildContext(outputs);

    for (const step of this.steps) {
      try {
        outputs[step.name] = await step.fn(ctx);
        console.log(`[OK] ${step.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[FAIL] ${step.name}: ${message}`);
        throw err;
      }
    }
  }
}

export function suite(): TestSuite {
  return new TestSuite();
}
