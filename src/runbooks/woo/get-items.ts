import "../load-env.js";
import { WooCommerceProduct, suite, SuiteRunOption } from "../../index.js";

const PER_PAGE = 10;
const PAGE = 1;

await suite()
  .basicAuth({
    username: process.env.WOO_CONSUMER_KEY!,
    password: process.env.WOO_CONSUMER_SECRET!,
  })
  .woo({
    baseUrl: process.env.WOO_BASE_URL!,
  })
  .step("get-auth-header",  async (ctx) => ctx.auth.basicAuth())
  .step("get-items", async (ctx) => {
    const basicAuthHeader = ctx.outputs["get-auth-header"] as string;
    return ctx.services.woo.getProducts(PER_PAGE, PAGE, basicAuthHeader);
  })
  .step("log-items", async (ctx) => {
    const items = ctx.outputs["get-items"] as WooCommerceProduct[];
    items.forEach((item) => console.log(`Name: ${item.name}`));
  })
  .run(SuiteRunOption.ThrowOnError);
