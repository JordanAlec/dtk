import "../load-env.js";
import { suite, SuiteRunOption } from "../../index.js";
import type { TokenResponse, XeroItem } from "../../index.js";


const ITEM_CODE = "TEST-PROD";

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
  .step("delete-item", async (ctx) => {
    const item = ctx.outputs["get-item"] as XeroItem;
    if (!item?.ItemID) {
      console.log("Item not found.");
      return;
    }

    const token = ctx.outputs["get-token"] as TokenResponse;
    const response = await ctx.services.xero.deleteItem(item.ItemID, token.access_token);
    console.log(response == 200 ? "Item deleted." : "Failed to delete item.");
  })
  .run(SuiteRunOption.ContinueOnError);
