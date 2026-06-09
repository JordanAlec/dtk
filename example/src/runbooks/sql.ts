import "../load-env.js";
import { suite } from "../suite.js";
import { createSqlService } from "../services/sql.js";

type User = { id: number; name: string; email: string; };
type TransferResult = { status: string; };

const sql = createSqlService({
  client: 'pg', // change to 'mysql2' or 'mssql' as needed
  connection: process.env.SQL_CONNECTION_STRING!,
});

try {
  await suite()
    .step("query-users", async () => {
      const users = await sql.query<User>(
        "SELECT id, name, email FROM users WHERE active = ?",
        [true]
      );
      console.log("active users:", users);
      return users;
    })
    .step("insert-user", async () => {
      const affected = await sql.execute(
        "INSERT INTO users (name, email, active) VALUES (?, ?, ?)",
        ["Alice", "alice@example.com", true]
      );
      console.log("rows inserted:", affected);
      return affected;
    })
    .step("call-stored-proc", async () => {
      const result = await sql.callProc<TransferResult>(
        "usp_activate_user",
        [42]
      );
      console.log("proc result:", result);
      return result;
    })
    .step("transfer-in-transaction", async () => {
      await sql.transaction(async (ops) => {
        await ops.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [100, 1]);
        await ops.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [100, 2]);
      });
      console.log("transfer complete");
    })
    .run("stopOnError");
} finally {
  await sql.disconnect();
}
