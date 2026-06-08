import "../load-env.js";
import { suite } from "../suite.js";

type User = { id: number; name: string; email: string; };
type TransferResult = { status: string; };

await suite()
  .sql({
    client: 'pg', // change to 'mysql2' or 'mssql' as needed
    connection: process.env.SQL_CONNECTION_STRING!,
  })
  .step("query-users", async (ctx) => {
    const users = await ctx.services.sql.query<User>(
      "SELECT id, name, email FROM users WHERE active = ?",
      [true]
    );
    console.log("active users:", users);
    return users;
  })
  .step("insert-user", async (ctx) => {
    const affected = await ctx.services.sql.execute(
      "INSERT INTO users (name, email, active) VALUES (?, ?, ?)",
      ["Alice", "alice@example.com", true]
    );
    console.log("rows inserted:", affected);
    return affected;
  })
  .step("call-stored-proc", async (ctx) => {
    const result = await ctx.services.sql.callProc<TransferResult>(
      "usp_activate_user",
      [42]
    );
    console.log("proc result:", result);
    return result;
  })
  .step("transfer-in-transaction", async (ctx) => {
    await ctx.services.sql.transaction(async (ops) => {
      await ops.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [100, 1]);
      await ops.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [100, 2]);
    });
    console.log("transfer complete");
  })
  .step("disconnect", async (ctx) => {
    await ctx.services.sql.disconnect();
  })
  .run("stopOnError");
