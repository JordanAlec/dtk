import "./load-env.js";
import { suite, SuiteRunOption } from "../index.js";

interface GitHubUser {
  login: string;
  name: string;
  public_repos: number;
  followers: number;
}

await suite()
  .step("fetch-github-user", async (ctx) => {
    const user = await ctx.http.get<GitHubUser>("https://api.github.com/users/torvalds", {
      headers: { "User-Agent": "dtk-test-harness" },
    });
    console.log(`login: ${user.login}`);
    console.log(`name: ${user.name}`);
    console.log(`public_repos: ${user.public_repos}`);
    console.log(`followers: ${user.followers}`);
    return user;
  })
  .run(SuiteRunOption.ThrowOnError);
