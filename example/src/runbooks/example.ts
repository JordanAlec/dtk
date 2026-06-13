import axios from 'axios';
import "../load-env.js";
import { suite } from "../suite.js";
import { RateLimiter } from "../lib/http.js";

interface GitHubUser {
  login: string;
  name: string;
  public_repos: number;
  followers: number;
}

const limiter = new RateLimiter(5, 1000);

await suite()
  .step("fetch-github-user", async (ctx) => {
    const user = await ctx.http.get<GitHubUser>(
      "https://api.github.com/users/torvalds",
      {
        headers: { "User-Agent": "dtk-runbook" },
        timeoutMs: 5000,
        rateLimiter: limiter,
        retry: {
          attempts: 3,
          backoff: "exponential",
          delayMs: 500,
          maxDelayMs: 5000,
          retryOn: (err) =>
            axios.isAxiosError(err) &&
            [429, 503].includes(err.response?.status ?? 0),
        },
      }
    );
    console.log(`login: ${user.login}`);
    console.log(`name: ${user.name}`);
    console.log(`public_repos: ${user.public_repos}`);
    console.log(`followers: ${user.followers}`);
    return user;
  })
  .run("throwOnError");
