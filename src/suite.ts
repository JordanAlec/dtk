import { clientCredentials } from "./lib/oauth.js";
import { getClaimValues } from "./lib/token.js";
import { httpGet, httpPost } from "./lib/http.js";
import { createXeroService } from "./services/xero.js";
import { createSqsService } from "./services/sqs.js";
import { createSnsService } from "./services/sns.js";
import { OAuthConfig, XeroConfig, SqsConfig, SnsConfig, Step, StepContext, StepFn, SuiteRunOption, BasicAuthConfig, BearerTokenConfig, OpenAiConfig } from "./types.js";
import { WooCommerceConfig } from "./types/woo-commerce.js";
import { createWooCommerceService } from "./services/woo-commerce.js";
import { basicAuth } from "./lib/basic-auth.js";
import { bearerToken } from "./lib/bearer-token.js";
import { createOpenAIService } from "./services/open-ai.js";

class TestSuite {
  private steps: Step[] = [];
  private oauthConfig?: OAuthConfig;
  private basicAuthConfig?: BasicAuthConfig;
  private bearerTokenConfig?: BearerTokenConfig;
  private xeroConfig?: XeroConfig;
  private sqsConfig?: SqsConfig;
  private snsConfig?: SnsConfig;
  private wooConfig?: WooCommerceConfig;
  private openAiConfig?: OpenAiConfig;

  oauth(config: OAuthConfig): this {
    this.oauthConfig = config;
    return this;
  }

  basicAuth(config: BasicAuthConfig): this {
    this.basicAuthConfig = config;
    return this;
  }

  bearerToken(config: BearerTokenConfig): this {
    this.bearerTokenConfig = config;
    return this;
  }

  xero(config: XeroConfig): this {
    this.xeroConfig = config;
    return this;
  }

  woo(config: WooCommerceConfig): this {
    this.wooConfig = config;
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

  openAi(config: OpenAiConfig): this {
    this.openAiConfig = config;
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
        basicAuth: (config?) => basicAuth(config ?? this.basicAuthConfig!),
        bearerToken: (config?) => bearerToken(config ?? this.bearerTokenConfig!),
      },
      http: {
        get: httpGet,
        post: httpPost,
      },
      services: {
        xero: createXeroService(this.xeroConfig),
        woo: createWooCommerceService(this.wooConfig),
        openAi: createOpenAIService(this.openAiConfig),
        sqs: createSqsService(this.sqsConfig),
        sns: createSnsService(this.snsConfig),
      },
    };
  }

  async run(throwOnFailure: SuiteRunOption): Promise<void> {
    const outputs: Record<string, unknown> = {};
    const ctx = this.buildContext(outputs);

    for (const step of this.steps) {
      try {
        outputs[step.name] = await step.fn(ctx);
        console.log(`[OK] ${step.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[FAIL] ${step.name}: ${message}`);
        if (throwOnFailure === SuiteRunOption.ThrowOnError) {
          throw err;
        } else {
          break;
        }
      }
    }
  }
}

export function suite(): TestSuite {
  return new TestSuite();
}
