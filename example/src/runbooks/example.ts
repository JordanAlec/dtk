import "../load-env.js";
import { suite } from "../suite.js";

interface GitHubUser {
  login: string;
  name: string;
  public_repos: number;
  followers: number;
}

await suite()
  .step("fetch-github-user", async (ctx) => {
    const user = await ctx.http.get<GitHubUser>("https://api.github.com/users/torvalds", {
      headers: { "User-Agent": "dtk-runbook" },
    });
    console.log(`login: ${user.login}`);
    console.log(`name: ${user.name}`);
    return user;
  })
  .run("throwOnError");
