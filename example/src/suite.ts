import { clientCredentials } from "./lib/oauth.js";
import { getClaimValues } from "./lib/token.js";
import { httpGet, httpPost, httpPut, httpDelete } from "./lib/http.js";
import { basicAuth } from "./lib/basic-auth.js";
import { bearerToken } from "./lib/bearer-token.js";
import { createDynamoService } from "./services/dynamo.js";
import type { DynamoConfig } from "./types/aws-dynamo.js";
import { createS3Service } from "./services/s3.js";
import type { S3Config } from "./types/aws-s3.js";
import { createSqsService } from "./services/sqs.js";
import type { SqsConfig } from "./types/aws-sqs.js";
import { createSnsService } from "./services/sns.js";
import type { SnsConfig } from "./types/aws-sns.js";
import { createOpenAIService } from "./services/open-ai.js";
import type { OpenAiConfig } from "./types/open-ai.js";
// dtk:imports

import type { OAuthConfig, BasicAuthConfig, BearerTokenConfig, StepContext, StepFn, Step, SuiteRunOption } from "./types/suite.js";

export type { SuiteRunOption };

class Suite {
  private steps: Step[] = [];
  private oauthConfig?: OAuthConfig;
  private basicAuthConfig?: BasicAuthConfig;
  private bearerTokenConfig?: BearerTokenConfig;
    private dynamoConfig?: DynamoConfig;
  private s3Config?: S3Config;
  private sqsConfig?: SqsConfig;
  private snsConfig?: SnsConfig;
  private openAiConfig?: OpenAiConfig;
// dtk:configs

  oauth(config: OAuthConfig): this { this.oauthConfig = config; return this; }
  basicAuth(config: BasicAuthConfig): this { this.basicAuthConfig = config; return this; }
  bearerToken(config: BearerTokenConfig): this { this.bearerTokenConfig = config; return this; }
    dynamo(config: DynamoConfig): this { this.dynamoConfig = config; return this; }
  s3(config: S3Config): this { this.s3Config = config; return this; }
  sqs(config: SqsConfig): this { this.sqsConfig = config; return this; }
  sns(config: SnsConfig): this { this.snsConfig = config; return this; }
  openAi(config: OpenAiConfig): this { this.openAiConfig = config; return this; }
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
                dynamo: createDynamoService(this.dynamoConfig),
        s3: createS3Service(this.s3Config),
        sqs: createSqsService(this.sqsConfig),
        sns: createSnsService(this.snsConfig),
        openAi: createOpenAIService(this.openAiConfig),
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

export function suite(): Suite {
  return new Suite();
}
