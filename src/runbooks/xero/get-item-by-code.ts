import "../load-env.js";
import { suite, SuiteRunOption } from "../../index.js";
import type { TokenResponse } from "../../index.js";

const ITEM_CODE = "MM-165";

await suite()
  .oauth({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    tokenUrl: process.env.TOKEN_URL!,
    scope: process.env.SCOPE,
  })
  .xero({
    baseUrl: process.env.XERO_BASE_URL!,
  })
  .step("get-token",  async (ctx) => ctx.auth.clientCredentials())
  .step("get-item", async (ctx) => {
    const token = ctx.outputs["get-token"] as TokenResponse;
    return ctx.services.xero.getItemByCode(ITEM_CODE, token.access_token);
  })
  .step("log-item", async (ctx) => {
    const item = ctx.outputs["get-item"];
    console.log("Item details:", item);
  })
  .run(SuiteRunOption.ThrowOnError);
