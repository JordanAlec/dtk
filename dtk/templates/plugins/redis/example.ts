import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .redis({
    url: process.env.REDIS_URL!,
  })
  .step("write-session", async (ctx) => {
    await ctx.services.redis.set("session:abc123", JSON.stringify({ userId: 42, role: "admin" }), 3600);
    console.log("session written with 1h TTL");
  })
  .step("read-session", async (ctx) => {
    const raw = await ctx.services.redis.get("session:abc123");
    const session = raw ? JSON.parse(raw) : null;
    console.log("session:", session);
    return session;
  })
  .step("check-existence", async (ctx) => {
    const exists = await ctx.services.redis.exists("session:abc123");
    console.log("session exists:", exists);
    return exists;
  })
  .step("hash-metadata", async (ctx) => {
    await ctx.services.redis.hset("user:42", "lastSeen", new Date().toISOString());
    const lastSeen = await ctx.services.redis.hget("user:42", "lastSeen");
    console.log("user:42 lastSeen:", lastSeen);
    return lastSeen;
  })
  .step("list-session-keys", async (ctx) => {
    const keys = await ctx.services.redis.keys("session:*");
    console.log("active sessions:", keys);
    return keys;
  })
  .step("disconnect", async (ctx) => {
    await ctx.services.redis.quit();
  })
  .run("stopOnError");
