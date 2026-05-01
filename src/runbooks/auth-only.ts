import "./load-env.js";
import { suite, TokenResponse } from "../index.js";

await suite()
  .oauth({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    tokenUrl: process.env.TOKEN_URL!,
    scope: process.env.SCOPE,
  })
  .step("get-token", async (ctx) => {
    const token = await ctx.auth.clientCredentials();
    console.log("access_token:", token.access_token);
    console.log("expires_in:", token.expires_in);
    return token;
  })
  .step("get-claims", async (ctx) => {
    const token = ctx.outputs["get-token"] as TokenResponse;
    const claims = ctx.auth.getClaimValues(token.access_token);
    console.log("claims:", claims);
    return claims;
  })
  .run();
