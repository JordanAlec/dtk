import axios from 'axios';
import "../load-env.js";
import { suite, SuiteRunOption } from "../suite.js";

interface GitHubUser {
  login: string;
  name: string;
  public_repos: number;
  followers: number;
}

await suite()
  .step("fetch-github-user", async (ctx) => {
    const user = await ctx.http.get<GitHubUser>(
      "https://api.github.com/users/torvalds",
      {
        headers: { "User-Agent": "dtk-runbook" },
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
    return user;
  })
  .run(SuiteRunOption.ThrowOnError);
