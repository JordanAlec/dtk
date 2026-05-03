import { clientCredentials } from "./lib/oauth.js";
import { getClaimValues } from "./lib/token.js";
import { httpGet, httpPost, httpPut, httpDelete } from "./lib/http.js";
import { basicAuth } from "./lib/basic-auth.js";
import { bearerToken } from "./lib/bearer-token.js";
// dtk:imports

import type { OAuthConfig, BasicAuthConfig, BearerTokenConfig, StepContext, StepFn, Step, SuiteRunOption } from "./types/suite.js";

export type { SuiteRunOption };

class TestSuite {
  private steps: Step[] = [];
  private oauthConfig?: OAuthConfig;
  private basicAuthConfig?: BasicAuthConfig;
  private bearerTokenConfig?: BearerTokenConfig;
  // dtk:configs

  oauth(config: OAuthConfig): this { this.oauthConfig = config; return this; }
  basicAuth(config: BasicAuthConfig): this { this.basicAuthConfig = config; return this; }
  bearerToken(config: BearerTokenConfig): this { this.bearerTokenConfig = config; return this; }
  // dtk:methods

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
        getClaimValues,
        basicAuth: (config?) => basicAuth(config ?? this.basicAuthConfig!),
        bearerToken: (config?) => bearerToken(config ?? this.bearerTokenConfig!),
      },
      http: {
        get: httpGet,
        post: httpPost,
        put: httpPut,
        delete: httpDelete,
      },
      services: {
        // dtk:services
      },
    };
  }

  async run(option: SuiteRunOption): Promise<void> {
    const outputs: Record<string, unknown> = {};
    const ctx = this.buildContext(outputs);
    for (const step of this.steps) {
      try {
        outputs[step.name] = await step.fn(ctx);
        console.log(`[OK] ${step.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[FAIL] ${step.name}: ${message}`);
        if (option === "throwOnError") throw err;
        else break;
      }
    }
  }
}

export function suite(): TestSuite {
  return new TestSuite();
}
