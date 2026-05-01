import "../load-env.js";
import { suite, SuiteRunOption } from "../../index.js";
import type { TokenResponse } from "../../index.js";

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
  .step("get-items", async (ctx) => {
    const token = ctx.outputs["get-token"] as TokenResponse;
    return ctx.services.xero.getItems(token.access_token);
  })
  .step("log-items", async (ctx) => {
    const items = ctx.outputs["get-items"];
    console.log("Item details:", items);
  })
  .run(SuiteRunOption.ThrowOnError);
