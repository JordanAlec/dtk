import "../load-env.js";
import { WooCommerceProduct, suite, SuiteRunOption } from "../../index.js";

const ITEM_CODE = "MM-ITB1X1";

await suite()
  .basicAuth({
    username: process.env.WOO_CONSUMER_KEY!,
    password: process.env.WOO_CONSUMER_SECRET!,
  })
  .woo({
    baseUrl: process.env.WOO_BASE_URL!,
  })
  .step("get-auth-header",  async (ctx) => ctx.auth.basicAuth())
  .step("get-item", async (ctx) => {
    const basicAuthHeader = ctx.outputs["get-auth-header"] as string;
    return ctx.services.woo.getProductByCode(ITEM_CODE, basicAuthHeader);
  })
  .step("log-item", async (ctx) => {
    const item = ctx.outputs["get-item"] as WooCommerceProduct;
    console.log(`Name: ${item.name}`);
  })
  .run(SuiteRunOption.ThrowOnError);
